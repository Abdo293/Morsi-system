mod storage;
mod printer;
use tauri::Manager;

fn startup_log_dir() -> std::path::PathBuf {
    let base_dir = std::env::var_os("LOCALAPPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    let preferred_dir = base_dir.join("com.morsi.forbelt");
    if std::fs::create_dir_all(&preferred_dir).is_ok() {
        preferred_dir
    } else {
        std::env::temp_dir()
    }
}

fn log_startup_stage(stage: &str) {
    use std::io::Write;

    let log_path = startup_log_dir().join("startup.log");
    if let Ok(mut log) = std::fs::OpenOptions::new().create(true).append(true).open(log_path) {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|time| time.as_secs())
            .unwrap_or_default();
        let _ = writeln!(log, "[{timestamp}] {stage}");
    }
}

fn log_main_window_state(app: &tauri::AppHandle, stage: &str) {
    if let Some(window) = app.get_webview_window("main") {
        log_startup_stage(&format!(
            "{stage}: visible={:?}, minimized={:?}, position={:?}, size={:?}",
            window.is_visible(),
            window.is_minimized(),
            window.outer_position(),
            window.outer_size()
        ));
    } else {
        log_startup_stage(&format!("{stage}: main window missing"));
    }
}

fn report_startup_error(error: &tauri::Error) {
    use std::io::Write;

    let mut details = error.to_string();
    let mut source = std::error::Error::source(error);
    while let Some(cause) = source {
        details.push_str(&format!("\nالسبب: {cause}"));
        source = cause.source();
    }

    let log_path = startup_log_dir().join("startup-error.log");
    if let Ok(mut log) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|time| time.as_secs())
            .unwrap_or_default();
        let _ = writeln!(log, "[{timestamp}] {details}\n");
    }

    let message = format!("تعذر تشغيل البرنامج.\n\n{details}\n\nملف التشخيص: {}", log_path.display());
    #[cfg(target_os = "windows")]
    {
        #[link(name = "user32")]
        extern "system" {
            fn MessageBoxW(window: *mut std::ffi::c_void, text: *const u16, title: *const u16, flags: u32) -> i32;
        }
        let wide_message: Vec<u16> = message.encode_utf16().chain(std::iter::once(0)).collect();
        let wide_title: Vec<u16> = "خطأ في تشغيل Morsi".encode_utf16().chain(std::iter::once(0)).collect();
        unsafe { MessageBoxW(std::ptr::null_mut(), wide_message.as_ptr(), wide_title.as_ptr(), 0x10); }
    }
    #[cfg(not(target_os = "windows"))]
    eprintln!("{message}");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_startup_stage("process started");
    let default_panic_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log_startup_stage(&format!("panic: {info}"));
        default_panic_hook(info);
    }));

    let result = tauri::Builder::default()
        .setup(|app| {
            log_startup_stage("setup started");
            let state = tauri::async_runtime::block_on(storage::AppState::open(app.handle()))
                .map_err(|error| std::io::Error::other(format!("فشل تهيئة قاعدة البيانات: {error}")))?;
            log_startup_stage("database ready");
            app.manage(state);
            log_startup_stage("setup complete");
            Ok(())
        })
        .on_page_load(|webview, payload| {
            log_startup_stage(&format!(
                "page load {:?}: {} ({})",
                payload.event(),
                webview.label(),
                payload.url()
            ));
        })
        .on_window_event(|_, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                log_startup_stage("window destroyed");
            }
        })
        .invoke_handler(tauri::generate_handler![
            printer::get_default_receipt_printer,
            printer::list_receipt_printers,
            printer::pulse_cash_drawer,
            printer::print_thermal_bitmap,
            printer::print_document_pages,
            storage::setup_required,
            storage::bootstrap_admin,
            storage::list_login_users,
            storage::login,
            storage::current_session,
            storage::logout,
            storage::dashboard,
            storage::list_categories,
            storage::create_category,
            storage::list_warehouses,
            storage::create_warehouse,
            storage::list_suppliers,
            storage::create_supplier,
            storage::list_products,
            storage::create_product,
            storage::update_product,
            storage::delete_product,
            storage::list_invoices,
            storage::get_invoice_details,
            storage::create_sale,
            storage::list_customer_choices,
            storage::create_customer,
            storage::list_customers,
            storage::get_customer_details,
            storage::collect_customer_payment,
            storage::list_employees,
            storage::create_employee,
            storage::update_employee,
            storage::delete_employee,
            storage::get_my_attendance,
            storage::check_in,
            storage::check_out,
            storage::get_daily_attendance,
            storage::check_in_employee,
            storage::check_out_employee,
            storage::reset_employee_attendance,
            storage::get_telegram_settings,
            storage::configure_telegram,
            storage::test_telegram,
            storage::retry_telegram_alerts,
            storage::send_daily_report_to_telegram,
            storage::get_employee_account,
            storage::create_employee_reward,
            storage::delete_employee_reward,
            storage::create_employee_loan,
            storage::delete_employee_loan,
            storage::create_employee_deduction,
            storage::delete_employee_deduction,
            storage::record_employee_loan_repayment,
            storage::get_employee_stats,
            storage::list_suppliers_with_balances,
            storage::create_supplier_transaction,
            storage::get_supplier_statement,
            storage::get_invoice_refund_summary,
            storage::process_refund,
            storage::list_refunds,
            storage::get_refund_details,
            storage::delete_refund,
            storage::get_product_movement_report,
            storage::apply_inventory_audit_adjustments,
            storage::list_inventory_audit_reports,
            storage::get_inventory_audit_report_details,
            storage::save_inventory_audit_report,
            storage::delete_inventory_audit_report,
            storage::get_inventory_audit_settings,
            storage::save_inventory_audit_settings,
            storage::mark_inventory_audit_report_adjusted,
            storage::create_online_order,
            storage::list_online_orders,
            storage::get_online_order_details,
            storage::confirm_online_order,
            storage::cancel_online_order,
            storage::get_backup_overview,
            storage::create_backup,
            storage::restore_backup,
            storage::delete_backup,
            storage::import_external_backup,
            storage::export_backup_file,
            storage::save_backup_settings,
            storage::open_backups_directory,
            storage::factory_reset_system,
        ])
        .build(tauri::generate_context!())
        .map(|app| {
            log_startup_stage("application built");
            app.run(|app, event| match event {
                tauri::RunEvent::Ready => {
                    log_startup_stage("event loop ready");
                    log_main_window_state(app, "window at ready");
                    let handle = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(3));
                        log_main_window_state(&handle, "window after 3 seconds");
                        if let Some(window) = handle.get_webview_window("main") {
                            let hidden = matches!(window.is_visible(), Ok(false));
                            let minimized = matches!(window.is_minimized(), Ok(true));
                            if hidden || minimized {
                                log_startup_stage("restoring hidden or minimized window");
                                if minimized {
                                    log_startup_stage(&format!("unminimize result: {:?}", window.unminimize()));
                                }
                                if hidden {
                                    log_startup_stage(&format!("show result: {:?}", window.show()));
                                }
                                log_startup_stage(&format!("focus result: {:?}", window.set_focus()));
                                log_main_window_state(&handle, "window after restore");
                            }
                        }
                    });
                },
                tauri::RunEvent::ExitRequested { code, .. } => {
                    log_startup_stage(&format!("exit requested: {code:?}"));
                }
                tauri::RunEvent::Exit => log_startup_stage("event loop exit"),
                _ => {}
            });
        });

    match result {
        Ok(()) => log_startup_stage("application exited normally"),
        Err(error) => {
            log_startup_stage(&format!("application error: {error}"));
            report_startup_error(&error);
        }
    }
}
