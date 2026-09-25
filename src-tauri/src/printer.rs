#[tauri::command]
pub async fn get_default_receipt_printer() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(platform::default_printer)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn set_default_receipt_printer(printer_name: String) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر الطابعة أولاً".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        platform::set_default_printer(&printer_name)
    })
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
    let name = printer_name.trim().to_string();
    let target = if name.is_empty() {
        platform::default_printer()?
    } else {
        name
    };
    if pin > 2 {
        return Err("منفذ الدرج غير صالح".into());
    }
    tauri::async_runtime::spawn_blocking(move || platform::pulse(&target, pin))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn print_thermal_bitmap(
    printer_name: String,
    width_bytes: u16,
    height: u32,
    pixels: Vec<u8>,
    paper_width_mm: Option<u16>,
    paper_height_mm: Option<u16>,
    cut: Option<bool>,
    drawer_pin: Option<u8>,
) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر الطابعة الحرارية أولاً".into());
    }
    if width_bytes == 0 || width_bytes > 200 || height == 0 || height > 50_000 {
        return Err("مقاس الصورة الحرارية غير صالح".into());
    }
    if pixels.len() != width_bytes as usize * height as usize {
        return Err("بيانات الصورة الحرارية غير مكتملة".into());
    }
    if drawer_pin.is_some_and(|pin| pin > 2) {
        return Err("منفذ الدرج غير صالح".into());
    }

    let cut_paper = cut.unwrap_or(true);
    let paper_w = paper_width_mm.unwrap_or(80);
    let paper_h = paper_height_mm.unwrap_or(0);

    tauri::async_runtime::spawn_blocking(move || {
        platform::print_thermal_gdi(
            &printer_name,
            width_bytes,
            height,
            &pixels,
            paper_w,
            paper_h,
            cut_paper,
            drawer_pin,
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThermalLabelBitmap {
    pub width_bytes: u16,
    pub height: u32,
    pub pixels: Vec<u8>,
}

#[tauri::command]
pub async fn print_thermal_labels(
    printer_name: String,
    labels: Vec<ThermalLabelBitmap>,
    paper_width_mm: Option<u16>,
    paper_height_mm: Option<u16>,
) -> Result<(), String> {
    if printer_name.trim().is_empty() {
        return Err("اختر الطابعة الحرارية أولاً".into());
    }
    if labels.is_empty() || labels.len() > 3000 {
        return Err("عدد الملصقات غير صالح".into());
    }
    for label in &labels {
        if label.width_bytes == 0 || label.width_bytes > 200 || label.height == 0 || label.height > 50_000 {
            return Err("مقاس صورة الملصق غير صالح".into());
        }
        if label.pixels.len() != label.width_bytes as usize * label.height as usize {
            return Err("بيانات صورة الملصق غير مكتملة".into());
        }
    }

    let paper_w = paper_width_mm.unwrap_or(50);
    let paper_h = paper_height_mm.unwrap_or(30);

    tauri::async_runtime::spawn_blocking(move || {
        platform::print_thermal_labels_gdi(&printer_name, &labels, paper_w, paper_h)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentBitmapPage {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
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
            || page.width % 8 != 0
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
pub fn escpos_bitmap_bytes(
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
        bytes.extend_from_slice(&[0x1b, 0x64, 2, 0x1d, 0x56, 66, 0]);
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
        fn SetDefaultPrinterW(name: *const u16) -> i32;
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

    pub fn set_default_printer(printer_name: &str) -> Result<(), String> {
        let name_wide = wide(printer_name);
        if unsafe { SetDefaultPrinterW(name_wide.as_ptr()) } == 0 {
            return Err(os_error("تعذر تعيين الطابعة كافتراضية في ويندوز"));
        }
        Ok(())
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

    pub fn send_raw_job(printer_name: &str, title: &str, bytes: &[u8]) -> Result<(), String> {
        let mut name = wide(printer_name);
        let mut handle = std::ptr::null_mut();
        if unsafe { OpenPrinterW(name.as_mut_ptr(), &mut handle, std::ptr::null_mut()) } == 0 {
            return Err(os_error("تعذر فتح طابعة ويندوز"));
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
                return Err(os_error("تعذر بدء مهمة الطباعة"));
            }

            let page_started = unsafe { StartPagePrinter(handle) } != 0;

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

            if page_started {
                unsafe { EndPagePrinter(handle) };
            }
            unsafe { EndDocPrinter(handle) };

            if let Some(err) = error {
                Err(err)
            } else {
                Ok(())
            }
        })();
        unsafe { ClosePrinter(handle) };
        result
    }

    pub fn drawer_kick_bytes(pin: Option<u8>) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(32);

        // 1. ESC @ to reset printer command parser state
        bytes.extend_from_slice(&[0x1b, 0x40]);

        match pin {
            Some(1) => {
                // Pin 5
                bytes.extend_from_slice(&[0x1b, 0x70, 1, 50, 100]);
                bytes.extend_from_slice(&[0x1b, 0x70, 49, 50, 100]);
            }
            Some(2) => {
                // Both Pin 2 & Pin 5
                bytes.extend_from_slice(&[0x1b, 0x70, 0, 50, 50]);
                bytes.extend_from_slice(&[0x1b, 0x70, 48, 50, 50]);
                bytes.extend_from_slice(&[0x1b, 0x70, 1, 50, 50]);
                bytes.extend_from_slice(&[0x1b, 0x70, 49, 50, 50]);
                bytes.push(0x07);
            }
            _ => {
                // Default: Pin 2 (Standard ESC/POS drawer kick)
                bytes.extend_from_slice(&[0x1b, 0x70, 0, 50, 100]);
                bytes.extend_from_slice(&[0x1b, 0x70, 48, 50, 100]);
                bytes.push(0x07);
            }
        }

        bytes
    }

    pub fn pulse(printer_name: &str, pin: u8) -> Result<(), String> {
        let bytes = drawer_kick_bytes(Some(pin));
        send_raw_job(
            printer_name,
            "Morsi cash drawer",
            &bytes,
        )
    }

    pub fn print_thermal_gdi(
        printer_name: &str,
        width_bytes: u16,
        height: u32,
        pixels: &[u8],
        _paper_width_mm: u16,
        _paper_height_mm: u16,
        cut: bool,
        drawer_pin: Option<u8>,
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
            return Err(os_error("تعذر فتح طابعة ويندوز"));
        }

        let result = (|| {
            let title = wide("Morsi thermal receipt");
            let info = DocInfoW {
                size: std::mem::size_of::<DocInfoW>() as i32,
                name: title.as_ptr(),
                output: std::ptr::null(),
                data_type: std::ptr::null(),
                flags: 0,
            };
            if unsafe { StartDocW(dc, &info) } <= 0 {
                return Err(os_error("تعذر بدء طباعة الفاتورة من تعريف ويندوز"));
            }

            let mut page_started = false;
            let print_result = (|| {
                if unsafe { StartPage(dc) } <= 0 {
                    return Err(os_error("تعذر بدء صفحة الفاتورة"));
                }
                page_started = true;

                const HORZRES: i32 = 8;
                let printable_width = unsafe { GetDeviceCaps(dc, HORZRES) };
                if printable_width <= 0 {
                    return Err("تعذر قراءة دقة ومساحة الطباعة من تعريف الطابعة".into());
                }

                let src_width_pixels = (width_bytes as i32) * 8;
                let dest_width = printable_width;
                let dest_height = ((height as f64 * dest_width as f64) / (src_width_pixels as f64)).round() as i32;

                // Build a valid, compliant Bottom-Up 1-bit monochrome DIB (Windows printer drivers require bottom-up)
                let padded_stride = (width_bytes as usize).div_ceil(4) * 4;
                let mut bottom_up_pixels = vec![0u8; padded_stride * height as usize];

                for src_y in 0..height as usize {
                    let dst_y = (height as usize - 1) - src_y; // Invert scanlines for bottom-up DIB
                    let src_offset = src_y * width_bytes as usize;
                    let dst_offset = dst_y * padded_stride;
                    bottom_up_pixels[dst_offset..dst_offset + width_bytes as usize]
                        .copy_from_slice(&pixels[src_offset..src_offset + width_bytes as usize]);
                }

                let bitmap = BitmapInfo {
                    header: BitmapInfoHeader {
                        size: std::mem::size_of::<BitmapInfoHeader>() as u32,
                        width: src_width_pixels,
                        height: height as i32, // Positive height = standard bottom-up DIB!
                        planes: 1,
                        bit_count: 1,
                        compression: 0, // BI_RGB
                        image_size: bottom_up_pixels.len() as u32,
                        x_pels_per_meter: 0,
                        y_pels_per_meter: 0,
                        colors_used: 2,
                        colors_important: 2,
                    },
                    colors: [[255, 255, 255, 0], [0, 0, 0, 0]],
                };

                const DIB_RGB_COLORS: u32 = 0;
                const SRCCOPY: u32 = 0x00cc0020;
                let printed = unsafe {
                    StretchDIBits(
                        dc,
                        0,
                        0,
                        dest_width,
                        dest_height,
                        0,
                        0,
                        src_width_pixels,
                        height as i32,
                        bottom_up_pixels.as_ptr().cast(),
                        &bitmap,
                        DIB_RGB_COLORS,
                        SRCCOPY,
                    )
                };

                if printed <= 0 {
                    Err(os_error("تعذر رسم الفاتورة على تعريف الطابعة"))
                } else {
                    Ok(())
                }
            })();

            let page_end = if page_started && unsafe { EndPage(dc) } <= 0 {
                Err(os_error("تعذر إنهاء صفحة الطباعة الحرارية"))
            } else {
                Ok(())
            };

            let doc_end = if unsafe { EndDoc(dc) } <= 0 {
                Err(os_error("تعذر إنهاء مهمة الطباعة الحرارية"))
            } else {
                Ok(())
            };

            print_result.and(page_end).and(doc_end)
        })();

        unsafe { DeleteDC(dc) };
        result?;

        // Pulse cash drawer and/or cut paper in a single raw job if requested
        let mut raw_post = Vec::new();
        if let Some(pin) = drawer_pin {
            raw_post.extend_from_slice(&drawer_kick_bytes(Some(pin)));
        }
        if cut {
            raw_post.extend_from_slice(&[0x1d, 0x56, 66, 0]);
        }
        if !raw_post.is_empty() {
            std::thread::sleep(std::time::Duration::from_millis(350));
            if let Err(err) = send_raw_job(printer_name, "Drawer/Cut", &raw_post) {
                eprintln!("Failed to send drawer/cut job: {}", err);
                std::thread::sleep(std::time::Duration::from_millis(350));
                let _ = send_raw_job(printer_name, "Drawer/Cut", &raw_post);
            }
        }

        Ok(())
    }

    pub fn print_thermal_labels_gdi(
        printer_name: &str,
        labels: &[super::ThermalLabelBitmap],
        _paper_width_mm: u16,
        _paper_height_mm: u16,
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
            return Err(os_error("تعذر فتح طابعة ويندوز"));
        }

        let result = (|| {
            let title = wide("Morsi thermal labels");
            let info = DocInfoW {
                size: std::mem::size_of::<DocInfoW>() as i32,
                name: title.as_ptr(),
                output: std::ptr::null(),
                data_type: std::ptr::null(),
                flags: 0,
            };
            if unsafe { StartDocW(dc, &info) } <= 0 {
                return Err(os_error("تعذر بدء طباعة الملصقات من تعريف ويندوز"));
            }

            const HORZRES: i32 = 8;
            let printable_width = unsafe { GetDeviceCaps(dc, HORZRES) };
            if printable_width <= 0 {
                return Err("تعذر قراءة دقة ومساحة الطباعة من تعريف الطابعة".into());
            }

            let mut print_result = Ok(());

            for label in labels {
                if unsafe { StartPage(dc) } <= 0 {
                    print_result = Err(os_error("تعذر بدء صفحة الملصق"));
                    break;
                }

                let src_width_pixels = (label.width_bytes as i32) * 8;
                let dest_width = printable_width;
                let dest_height = ((label.height as f64 * dest_width as f64) / (src_width_pixels as f64)).round() as i32;

                let padded_stride = (label.width_bytes as usize).div_ceil(4) * 4;
                let mut bottom_up_pixels = vec![0u8; padded_stride * label.height as usize];

                for src_y in 0..label.height as usize {
                    let dst_y = (label.height as usize - 1) - src_y;
                    let src_offset = src_y * label.width_bytes as usize;
                    let dst_offset = dst_y * padded_stride;
                    bottom_up_pixels[dst_offset..dst_offset + label.width_bytes as usize]
                        .copy_from_slice(&label.pixels[src_offset..src_offset + label.width_bytes as usize]);
                }

                let bitmap = BitmapInfo {
                    header: BitmapInfoHeader {
                        size: std::mem::size_of::<BitmapInfoHeader>() as u32,
                        width: src_width_pixels,
                        height: label.height as i32,
                        planes: 1,
                        bit_count: 1,
                        compression: 0,
                        image_size: bottom_up_pixels.len() as u32,
                        x_pels_per_meter: 0,
                        y_pels_per_meter: 0,
                        colors_used: 2,
                        colors_important: 2,
                    },
                    colors: [[255, 255, 255, 0], [0, 0, 0, 0]],
                };

                const DIB_RGB_COLORS: u32 = 0;
                const SRCCOPY: u32 = 0x00cc0020;
                let printed = unsafe {
                    StretchDIBits(
                        dc,
                        0,
                        0,
                        dest_width,
                        dest_height,
                        0,
                        0,
                        src_width_pixels,
                        label.height as i32,
                        bottom_up_pixels.as_ptr().cast(),
                        &bitmap,
                        DIB_RGB_COLORS,
                        SRCCOPY,
                    )
                };

                let page_end = unsafe { EndPage(dc) };

                if printed <= 0 {
                    print_result = Err(os_error("تعذر رسم الملصق على تعريف الطابعة"));
                    break;
                }
                if page_end <= 0 {
                    print_result = Err(os_error("تعذر إنهاء صفحة الملصق"));
                    break;
                }
            }

            let doc_end = if unsafe { EndDoc(dc) } <= 0 {
                Err(os_error("تعذر إنهاء مهمة طباعة الملصقات"))
            } else {
                Ok(())
            };

            print_result.and(doc_end)
        })();

        unsafe { DeleteDC(dc) };
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
                    let width_bytes = (page.width as usize) / 8;
                    let padded_stride = width_bytes.div_ceil(4) * 4;
                    let mut bottom_up_pixels = vec![0u8; padded_stride * page.height as usize];

                    for src_y in 0..page.height as usize {
                        let dst_y = (page.height as usize - 1) - src_y;
                        let src_offset = src_y * width_bytes;
                        let dst_offset = dst_y * padded_stride;
                        bottom_up_pixels[dst_offset..dst_offset + width_bytes]
                            .copy_from_slice(&page.pixels[src_offset..src_offset + width_bytes]);
                    }

                    let bitmap = BitmapInfo {
                        header: BitmapInfoHeader {
                            size: std::mem::size_of::<BitmapInfoHeader>() as u32,
                            width: page.width as i32,
                            height: page.height as i32, // Positive height = Bottom-Up DIB!
                            planes: 1,
                            bit_count: 1,
                            compression: 0,
                            image_size: bottom_up_pixels.len() as u32,
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
                            bottom_up_pixels.as_ptr().cast(),
                            &bitmap,
                            DIB_RGB_COLORS,
                            SRCCOPY,
                        )
                    };
                    if printed <= 0 {
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

    #[allow(dead_code)]
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
        Err("طابعات ويندوز متاحة داخل نسخة التطبيق المثبتة على ويندوز".into())
    }

    pub fn set_default_printer(_: &str) -> Result<(), String> {
        Ok(())
    }

    pub fn list_printers() -> Result<Vec<String>, String> {
        Err("طابعات ويندوز متاحة داخل نسخة التطبيق المثبتة على ويندوز".into())
    }

    pub fn pulse(_: &str, _: u8) -> Result<(), String> {
        Err("فتح الدرج التلقائي متاح حالياً على ويندوز".into())
    }

    pub fn print_thermal_gdi(
        _: &str, _: u16, _: u32, _: &[u8], _: u16, _: u16, _: bool, _: Option<u8>,
    ) -> Result<(), String> {
        Err("الطباعة الحرارية المباشرة متاحة حالياً على ويندوز".into())
    }

    pub fn print_thermal_labels_gdi(
        _: &str, _: &[super::ThermalLabelBitmap], _: u16, _: u16,
    ) -> Result<(), String> {
        Err("الطباعة الحرارية المباشرة للملصقات متاحة حالياً على ويندوز".into())
    }

    pub fn print_document(_: &str, _: &[super::DocumentBitmapPage]) -> Result<(), String> {
        Err("طباعة التقارير المباشرة متاحة حالياً على ويندوز".into())
    }

    #[allow(dead_code)]
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
