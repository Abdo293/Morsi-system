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

#[tauri::command]
pub async fn print_thermal_bitmap(
    printer_name: String,
    width_bytes: u16,
    height: u32,
    pixels: Vec<u8>,
    cut: bool,
    drawer_pin: Option<u8>,
) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر الطابعة الحرارية أولاً".into());
    }
    if width_bytes == 0 || width_bytes > 72 || height == 0 || height > 20_000 {
        return Err("مقاس الصورة الحرارية غير صالح".into());
    }
    if pixels.len() != width_bytes as usize * height as usize {
        return Err("بيانات الصورة الحرارية غير مكتملة".into());
    }
    if drawer_pin.is_some_and(|pin| pin > 1) {
        return Err("منفذ الدرج غير صالح".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        platform::print_bitmap(&printer_name, width_bytes, height, &pixels, cut, drawer_pin)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentBitmapPage {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

#[tauri::command]
pub async fn print_document_pages(
    printer_name: String,
    pages: Vec<DocumentBitmapPage>,
) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر طابعة التقارير أولاً".into());
    }
    if pages.is_empty() || pages.len() > 100 {
        return Err("عدد صفحات التقرير غير صالح".into());
    }
    for page in &pages {
        if page.width == 0
            || page.width > 4000
            || page.width % 32 != 0
            || page.height == 0
            || page.height > 5000
        {
            return Err("مقاس صفحة التقرير غير صالح".into());
        }
        if page.pixels.len() != (page.width as usize / 8) * page.height as usize {
            return Err("بيانات صفحة التقرير غير مكتملة".into());
        }
    }
    tauri::async_runtime::spawn_blocking(move || platform::print_document(&printer_name, &pages))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(any(test, target_os = "windows"))]
fn escpos_bitmap_bytes(
    width_bytes: u16,
    height: u32,
    pixels: &[u8],
    cut: bool,
    drawer_pin: Option<u8>,
) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(pixels.len() + (height as usize / 256 + 1) * 8 + 16);
    bytes.extend_from_slice(&[0x1b, 0x40]); // Initialize ESC/POS printer.
    let row_bytes = width_bytes as usize;
    for start_row in (0..height as usize).step_by(256) {
        let rows = (height as usize - start_row).min(256);
        bytes.extend_from_slice(&[
            0x1d,
            0x76,
            0x30,
            0,
            (width_bytes & 0xff) as u8,
            (width_bytes >> 8) as u8,
            (rows & 0xff) as u8,
            (rows >> 8) as u8,
        ]);
        bytes.extend_from_slice(&pixels[start_row * row_bytes..(start_row + rows) * row_bytes]);
    }
    if cut {
        bytes.extend_from_slice(&[0x1b, 0x64, 1, 0x1d, 0x56, 66, 0]);
    }
    if let Some(pin) = drawer_pin {
        bytes.extend_from_slice(&[0x1b, 0x70, pin, 50, 100]);
    }
    bytes
}

#[cfg(test)]
mod tests {
    use super::escpos_bitmap_bytes;

    #[test]
    fn bitmap_job_preserves_exact_length_and_drawer_pulse() {
        let pixels = vec![0xaa; 300 * 2];
        let bytes = escpos_bitmap_bytes(2, 300, &pixels, true, Some(0));
        assert_eq!(&bytes[..10], &[0x1b, 0x40, 0x1d, 0x76, 0x30, 0, 2, 0, 0, 1]);
        assert_eq!(&bytes[10..10 + 512], &pixels[..512]);
        assert_eq!(&bytes[522..530], &[0x1d, 0x76, 0x30, 0, 2, 0, 44, 0]);
        assert_eq!(&bytes[530..618], &pixels[512..]);
        assert_eq!(
            &bytes[618..],
            &[0x1b, 0x64, 1, 0x1d, 0x56, 66, 0, 0x1b, 0x70, 0, 50, 100]
        );
    }
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

    #[repr(C)]
    struct DocInfoW {
        size: i32,
        name: *const u16,
        output: *const u16,
        data_type: *const u16,
        flags: u32,
    }

    #[repr(C)]
    struct BitmapInfoHeader {
        size: u32,
        width: i32,
        height: i32,
        planes: u16,
        bit_count: u16,
        compression: u32,
        image_size: u32,
        x_pels_per_meter: i32,
        y_pels_per_meter: i32,
        colors_used: u32,
        colors_important: u32,
    }

    #[repr(C)]
    struct BitmapInfo {
        header: BitmapInfoHeader,
        colors: [[u8; 4]; 2],
    }

    #[link(name = "gdi32")]
    extern "system" {
        fn CreateDCW(
            driver: *const u16,
            device: *const u16,
            output: *const u16,
            init_data: *const c_void,
        ) -> *mut c_void;
        fn DeleteDC(dc: *mut c_void) -> i32;
        fn GetDeviceCaps(dc: *mut c_void, index: i32) -> i32;
        fn StartDocW(dc: *mut c_void, info: *const DocInfoW) -> i32;
        fn EndDoc(dc: *mut c_void) -> i32;
        fn StartPage(dc: *mut c_void) -> i32;
        fn EndPage(dc: *mut c_void) -> i32;
        fn StretchDIBits(
            dc: *mut c_void,
            x: i32,
            y: i32,
            width: i32,
            height: i32,
            source_x: i32,
            source_y: i32,
            source_width: i32,
            source_height: i32,
            bits: *const c_void,
            info: *const BitmapInfo,
            color_usage: u32,
            operation: u32,
        ) -> i32;
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

    fn send_raw_job(printer_name: &str, title: &str, bytes: &[u8]) -> Result<(), String> {
        let mut name = wide(printer_name);
        let mut handle = std::ptr::null_mut();
        if unsafe { OpenPrinterW(name.as_mut_ptr(), &mut handle, std::ptr::null_mut()) } == 0 {
            return Err(os_error("تعذر فتح الطابعة الحرارية"));
        }

        let result = (|| {
            let mut document_name = wide(title);
            let mut data_type = wide("RAW");
            let mut info = DocInfo1W {
                name: document_name.as_mut_ptr(),
                output_file: std::ptr::null_mut(),
                data_type: data_type.as_mut_ptr(),
            };
            if unsafe { StartDocPrinterW(handle, 1, &mut info as *mut _ as *mut u8) } == 0 {
                return Err(os_error("تعذر بدء مهمة الطباعة الحرارية"));
            }

            let page_started = unsafe { StartPagePrinter(handle) } != 0;
            let write_result = if page_started {
                let mut sent = 0usize;
                let mut error = None;
                while sent < bytes.len() {
                    let mut written = 0;
                    let ok = unsafe {
                        WritePrinter(
                            handle,
                            bytes[sent..].as_ptr().cast(),
                            (bytes.len() - sent) as u32,
                            &mut written,
                        )
                    } != 0;
                    if !ok || written == 0 {
                        error = Some(os_error("تعذر إرسال البيانات للطابعة"));
                        break;
                    }
                    sent += written as usize;
                }
                error.map_or(Ok(()), Err)
            } else {
                Err(os_error("تعذر بدء صفحة الطباعة"))
            };
            let page_end_error = if page_started && unsafe { EndPagePrinter(handle) } == 0 {
                Some(os_error("تعذر إنهاء صفحة الطباعة"))
            } else {
                None
            };
            let doc_end_error = if unsafe { EndDocPrinter(handle) } == 0 {
                Some(os_error("تعذر إنهاء مهمة الطباعة"))
            } else {
                None
            };
            write_result?;
            if let Some(error) = page_end_error.or(doc_end_error) {
                Err(error)
            } else {
                Ok(())
            }
        })();
        unsafe { ClosePrinter(handle) };
        result
    }

    pub fn print_document(
        printer_name: &str,
        pages: &[super::DocumentBitmapPage],
    ) -> Result<(), String> {
        let driver = wide("WINSPOOL");
        let device = wide(printer_name);
        let dc = unsafe {
            CreateDCW(
                driver.as_ptr(),
                device.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
            )
        };
        if dc.is_null() {
            return Err(os_error("تعذر فتح طابعة التقارير"));
        }
        let result = (|| {
            let title = wide("Morsi document");
            let info = DocInfoW {
                size: std::mem::size_of::<DocInfoW>() as i32,
                name: title.as_ptr(),
                output: std::ptr::null(),
                data_type: std::ptr::null(),
                flags: 0,
            };
            if unsafe { StartDocW(dc, &info) } <= 0 {
                return Err(os_error("تعذر بدء طباعة التقرير"));
            }
            const HORZRES: i32 = 8;
            const VERTRES: i32 = 10;
            const DIB_RGB_COLORS: u32 = 0;
            const SRCCOPY: u32 = 0x00cc0020;
            let printable_width = unsafe { GetDeviceCaps(dc, HORZRES) };
            let printable_height = unsafe { GetDeviceCaps(dc, VERTRES) };
            let mut print_result = Ok(());
            if printable_width <= 0 || printable_height <= 0 {
                print_result = Err("تعذر معرفة مساحة الورق القابلة للطباعة".into());
            } else {
                for page in pages {
                    if unsafe { StartPage(dc) } <= 0 {
                        print_result = Err(os_error("تعذر بدء صفحة التقرير"));
                        break;
                    }
                    let bitmap = BitmapInfo {
                        header: BitmapInfoHeader {
                            size: std::mem::size_of::<BitmapInfoHeader>() as u32,
                            width: page.width as i32,
                            height: -(page.height as i32),
                            planes: 1,
                            bit_count: 1,
                            compression: 0,
                            image_size: page.pixels.len() as u32,
                            x_pels_per_meter: 0,
                            y_pels_per_meter: 0,
                            colors_used: 2,
                            colors_important: 2,
                        },
                        colors: [[255, 255, 255, 0], [0, 0, 0, 0]],
                    };
                    let printed = unsafe {
                        StretchDIBits(
                            dc,
                            0,
                            0,
                            printable_width,
                            printable_height,
                            0,
                            0,
                            page.width as i32,
                            page.height as i32,
                            page.pixels.as_ptr().cast(),
                            &bitmap,
                            DIB_RGB_COLORS,
                            SRCCOPY,
                        )
                    };
                    if printed == 0 || printed == -1 {
                        print_result = Err(os_error("تعذر رسم صفحة التقرير على الطابعة"));
                    }
                    if unsafe { EndPage(dc) } <= 0 && print_result.is_ok() {
                        print_result = Err(os_error("تعذر إنهاء صفحة التقرير"));
                    }
                    if print_result.is_err() {
                        break;
                    }
                }
            }
            let end_result = if unsafe { EndDoc(dc) } <= 0 {
                Err(os_error("تعذر إنهاء طباعة التقرير"))
            } else {
                Ok(())
            };
            print_result.and(end_result)
        })();
        unsafe { DeleteDC(dc) };
        result
    }

    pub fn pulse(printer_name: &str, pin: u8) -> Result<(), String> {
        // ESC p, 100 ms pulse on the selected drawer connector pin.
        send_raw_job(
            printer_name,
            "Morsi cash drawer",
            &[0x1b, 0x70, pin, 50, 100],
        )
    }

    pub fn print_bitmap(
        printer_name: &str,
        width_bytes: u16,
        height: u32,
        pixels: &[u8],
        cut: bool,
        drawer_pin: Option<u8>,
    ) -> Result<(), String> {
        let bytes = super::escpos_bitmap_bytes(width_bytes, height, pixels, cut, drawer_pin);
        send_raw_job(printer_name, "Morsi thermal print", &bytes)
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

    pub fn print_document(_: &str, _: &[super::DocumentBitmapPage]) -> Result<(), String> {
        Err("طباعة التقارير المباشرة متاحة حالياً على ويندوز".into())
    }

    pub fn pulse(_: &str, _: u8) -> Result<(), String> {
        Err("فتح الدرج التلقائي متاح حالياً على ويندوز".into())
    }

    pub fn print_bitmap(
        _: &str,
        _: u16,
        _: u32,
        _: &[u8],
        _: bool,
        _: Option<u8>,
    ) -> Result<(), String> {
        Err("الطباعة الحرارية المباشرة متاحة حالياً على ويندوز".into())
    }
}
