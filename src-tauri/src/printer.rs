#[tauri::command]
pub async fn get_default_receipt_printer() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(platform::default_printer)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn list_receipt_printers() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(platform::list_printers)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn pulse_cash_drawer(printer_name: String, pin: u8) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر طابعة الإيصالات أولاً".into());
    }
    if pin > 1 {
        return Err("منفذ الدرج غير صالح".into());
    }
    tauri::async_runtime::spawn_blocking(move || platform::pulse(&printer_name, pin))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(target_os = "windows")]
mod platform {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;

    #[repr(C)]
    struct DocInfo1W {
        name: *mut u16,
        output_file: *mut u16,
        data_type: *mut u16,
    }

    #[repr(C)]
    struct PrinterInfo4W {
        name: *const u16,
        server_name: *const u16,
        attributes: u32,
    }

    #[link(name = "winspool")]
    extern "system" {
        fn EnumPrintersW(
            flags: u32,
            name: *const u16,
            level: u32,
            buffer: *mut u8,
            size: u32,
            needed: *mut u32,
            returned: *mut u32,
        ) -> i32;
        fn GetDefaultPrinterW(buffer: *mut u16, size: *mut u32) -> i32;
        fn OpenPrinterW(name: *mut u16, handle: *mut *mut c_void, defaults: *mut c_void) -> i32;
        fn StartDocPrinterW(handle: *mut c_void, level: u32, info: *mut u8) -> u32;
        fn StartPagePrinter(handle: *mut c_void) -> i32;
        fn WritePrinter(
            handle: *mut c_void,
            data: *const c_void,
            size: u32,
            written: *mut u32,
        ) -> i32;
        fn EndPagePrinter(handle: *mut c_void) -> i32;
        fn EndDocPrinter(handle: *mut c_void) -> i32;
        fn ClosePrinter(handle: *mut c_void) -> i32;
    }

    fn wide(value: &str) -> Vec<u16> {
        std::ffi::OsStr::new(value)
            .encode_wide()
            .chain(Some(0))
            .collect()
    }

    fn os_error(action: &str) -> String {
        format!("{action}: {}", std::io::Error::last_os_error())
    }

    pub fn default_printer() -> Result<String, String> {
        let mut size = 0;
        unsafe { GetDefaultPrinterW(std::ptr::null_mut(), &mut size) };
        if size == 0 {
            return Err("لا توجد طابعة افتراضية في ويندوز".into());
        }
        let mut buffer = vec![0u16; size as usize];
        if unsafe { GetDefaultPrinterW(buffer.as_mut_ptr(), &mut size) } == 0 {
            return Err(os_error("تعذر معرفة الطابعة الافتراضية"));
        }
        let len = buffer
            .iter()
            .position(|&character| character == 0)
            .unwrap_or(buffer.len());
        Ok(String::from_utf16_lossy(&buffer[..len]))
    }

    pub fn list_printers() -> Result<Vec<String>, String> {
        const LOCAL_AND_CONNECTED: u32 = 0x2 | 0x4;
        let mut needed = 0;
        let mut returned = 0;
        unsafe {
            EnumPrintersW(
                LOCAL_AND_CONNECTED,
                std::ptr::null(),
                4,
                std::ptr::null_mut(),
                0,
                &mut needed,
                &mut returned,
            );
        }
        if needed == 0 {
            return Ok(Vec::new());
        }
        let words = (needed as usize).div_ceil(std::mem::size_of::<usize>());
        let mut buffer = vec![0usize; words];
        let ok = unsafe {
            EnumPrintersW(
                LOCAL_AND_CONNECTED,
                std::ptr::null(),
                4,
                buffer.as_mut_ptr().cast(),
                needed,
                &mut needed,
                &mut returned,
            )
        } != 0;
        if !ok {
            return Err(os_error("تعذر قراءة قائمة الطابعات"));
        }
        let printers = (0..returned as usize)
            .map(|index| {
                let info = unsafe { (buffer.as_ptr() as *const PrinterInfo4W).add(index).read() };
                if info.name.is_null() {
                    return String::new();
                }
                let len = unsafe {
                    (0..)
                        .take_while(|&offset| *info.name.add(offset) != 0)
                        .count()
                };
                String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(info.name, len) })
            })
            .filter(|name| !name.is_empty())
            .collect();
        Ok(printers)
    }

    pub fn pulse(printer_name: &str, pin: u8) -> Result<(), String> {
        let mut name = wide(printer_name);
        let mut handle = std::ptr::null_mut();
        if unsafe { OpenPrinterW(name.as_mut_ptr(), &mut handle, std::ptr::null_mut()) } == 0 {
            return Err(os_error("تعذر فتح طابعة الدرج"));
        }

        let result = (|| {
            let mut document_name = wide("Morsi cash drawer");
            let mut data_type = wide("RAW");
            let mut info = DocInfo1W {
                name: document_name.as_mut_ptr(),
                output_file: std::ptr::null_mut(),
                data_type: data_type.as_mut_ptr(),
            };
            if unsafe { StartDocPrinterW(handle, 1, &mut info as *mut _ as *mut u8) } == 0 {
                return Err(os_error("تعذر بدء أمر فتح الدرج"));
            }

            let page_started = unsafe { StartPagePrinter(handle) } != 0;
            let result = if page_started {
                // ESC p: pulse drawer connector pin 2 or 5 for 50 ms.
                let bytes = [0x1b, 0x70, pin, 25, 250];
                let mut written = 0;
                let ok = unsafe {
                    WritePrinter(
                        handle,
                        bytes.as_ptr().cast(),
                        bytes.len() as u32,
                        &mut written,
                    )
                } != 0;
                if ok && written == bytes.len() as u32 {
                    Ok(())
                } else {
                    Err(os_error("تعذر إرسال أمر فتح الدرج"))
                }
            } else {
                Err(os_error("تعذر بدء صفحة أمر الدرج"))
            };
            let page_end_error = if page_started && unsafe { EndPagePrinter(handle) } == 0 {
                Some(os_error("تعذر إنهاء صفحة أمر الدرج"))
            } else {
                None
            };
            let doc_end_error = if unsafe { EndDocPrinter(handle) } == 0 {
                Some(os_error("تعذر إنهاء أمر الدرج"))
            } else {
                None
            };
            result?;
            if let Some(error) = page_end_error.or(doc_end_error) {
                Err(error)
            } else {
                Ok(())
            }
        })();
        unsafe { ClosePrinter(handle) };
        result
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    pub fn default_printer() -> Result<String, String> {
        Err("فتح الدرج التلقائي متاح حالياً على ويندوز".into())
    }

    pub fn list_printers() -> Result<Vec<String>, String> {
        Err("قائمة طابعات الدرج متاحة حالياً على ويندوز".into())
    }

    pub fn pulse(_: &str, _: u8) -> Result<(), String> {
        Err("فتح الدرج التلقائي متاح حالياً على ويندوز".into())
    }
}
