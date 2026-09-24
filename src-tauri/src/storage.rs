use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use chrono::{DateTime, Duration, NaiveDate, NaiveTime, Timelike, Utc};
use chrono_tz::{Africa::Cairo, Tz};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use uuid::Uuid;

pub struct AppState {
    pool: SqlitePool,
    sessions: Mutex<HashMap<String, Session>>,
    data_dir: std::path::PathBuf,
}

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Clone)]
struct Session {
    user_id: i64,
    role: String,
    full_name: String,
    permissions: Vec<String>,
}

#[derive(Serialize)]
pub struct LoginResult {
    token: String,
    #[serde(rename = "user_id")]
    user_id: i64,
    full_name: String,
    role: String,
    permissions: Vec<String>,
}

#[derive(Serialize)]
pub struct NamedRecord {
    id: i64,
    name: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DaySalesSummary {
    pub date: String,
    pub day_name: String,
    pub gross_sales_piasters: i64,
    pub refunds_piasters: i64,
    pub net_sales_piasters: i64,
    pub invoice_count: i64,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PeriodSummary {
    pub gross_sales_piasters: i64,
    pub refunds_piasters: i64,
    pub refunds_count: i64,
    pub net_sales_piasters: i64,
    pub collected_piasters: i64,
    pub credit_sales_piasters: i64,
    pub debt_collected_piasters: i64,
    pub invoices_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub product_count: i64,
    pub total_invoices_count: i64,
    pub today_invoices_count: i64,
    pub today_gross_sales_piasters: i64,
    pub today_refunds_piasters: i64,
    pub today_refunds_count: i64,
    pub today_net_sales_piasters: i64,
    pub today_collected_piasters: i64,
    pub today_credit_sales_piasters: i64,
    pub today_debt_collected_piasters: i64,
    pub out_of_stock_count: i64,
    pub low_stock_count: i64,
    pub total_customer_debt_piasters: i64,
    pub customers_with_debt_count: i64,
    pub yesterday_net_sales_piasters: i64,
    pub last_7_days: Vec<DaySalesSummary>,
    pub recent_refunds: Vec<RefundView>,
    pub invoice_count: i64,
    pub sales_today_piasters: i64,
    pub today: PeriodSummary,
    pub week: PeriodSummary,
    pub month: PeriodSummary,
    pub all_time: PeriodSummary,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantInput {
    color: String,
    size: String,
    opening_quantity: i64,
    location: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductInput {
    name: String,
    category_id: i64,
    warehouse_id: i64,
    supplier_id: Option<i64>,
    barcode: Option<String>,
    buy_price_piasters: i64,
    sell_price_piasters: i64,
    low_stock_threshold: i64,
    opening_quantity: i64,
    location: Option<String>,
    variants: Vec<VariantInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductView {
    product_id: i64,
    variant_id: Option<i64>,
    warehouse_id: i64,
    supplier_id: Option<i64>,
    supplier: Option<String>,
    name: String,
    category: String,
    warehouse: String,
    color: Option<String>,
    size: Option<String>,
    barcode: String,
    quantity: i64,
    buy_price_piasters: i64,
    sell_price_piasters: i64,
    low_stock_threshold: i64,
    location: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleLineInput {
    product_id: i64,
    variant_id: Option<i64>,
    warehouse_id: i64,
    quantity: i64,
    sell_price_piasters: Option<i64>,
    name_override: Option<String>,
    discount_each_piasters: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleInput {
    seller_id: Option<i64>,
    employee_id: Option<i64>,
    customer_name: Option<String>,
    customer_phone: Option<String>,
    notes: Option<String>,
    paid_cash_piasters: i64,
    paid_instapay_piasters: i64,
    paid_wallet_piasters: i64,
    extra_discount_piasters: Option<i64>,
    lines: Vec<SaleLineInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleResult {
    invoice_number: i64,
    total_piasters: i64,
    remaining_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceView {
    invoice_number: i64,
    customer_name: Option<String>,
    seller_name: String,
    subtotal_piasters: i64,
    discount_piasters: i64,
    total_piasters: i64,
    paid_cash_piasters: i64,
    paid_instapay_piasters: i64,
    paid_wallet_piasters: i64,
    remaining_piasters: i64,
    created_at: String,
    status: String,
    online_order_number: Option<i64>,
    shipping_fee_piasters: i64,
    deposit_piasters: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeInput {
    name: String,
    username: Option<String>,
    password: Option<String>,
    permissions: Option<Vec<String>>,
    phone: Option<String>,
    job_title: String,
    address: Option<String>,
    work_hours: i64,
    hire_date: String,
    base_salary_piasters: i64,
    shift_start: String,
    shift_end: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeView {
    id: i64,
    user_id: Option<i64>,
    name: String,
    username: Option<String>,
    permissions: Vec<String>,
    phone: Option<String>,
    job_title: String,
    address: Option<String>,
    work_hours: i64,
    hire_date: String,
    base_salary_piasters: i64,
    shift_start: String,
    shift_end: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeProductStat {
    name: String,
    color: Option<String>,
    size: Option<String>,
    quantity: i64,
    total_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeDiscountDetail {
    pub invoice_number: i64,
    pub customer_name: Option<String>,
    pub discount_piasters: i64,
    pub total_piasters: i64,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeRefundDetail {
    pub refund_number: i64,
    pub invoice_number: i64,
    pub customer_name: Option<String>,
    pub total_refund_piasters: i64,
    pub refund_method: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeStatsView {
    pub completed_invoices_count: i64,
    pub cancelled_invoices_count: i64,
    pub subtotal_sales_piasters: i64,
    pub discount_sales_piasters: i64,
    pub total_sales_piasters: i64,
    pub gross_sales_piasters: i64,
    pub refund_sales_piasters: i64,
    pub refund_count: i64,
    pub paid_cash_piasters: i64,
    pub paid_instapay_piasters: i64,
    pub paid_wallet_piasters: i64,
    pub remaining_piasters: i64,
    pub top_products: Vec<EmployeeProductStat>,
    pub discounts_given: Vec<EmployeeDiscountDetail>,
    pub refunds_list: Vec<EmployeeRefundDetail>,
}

impl AppState {
    pub async fn open(app: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = app.path().app_local_data_dir()?;
        std::fs::create_dir_all(&data_dir)?;
        let database_path = data_dir.join("cashier.sqlite");
        let existed = database_path.exists();

        // Run migrations with foreign_keys = false so table recreations succeed without FK errors
        let migration_options = SqliteConnectOptions::new()
            .filename(&database_path)
            .create_if_missing(true)
            .foreign_keys(false)
            .journal_mode(SqliteJournalMode::Wal);
        let migration_pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(migration_options)
            .await?;
        let migration_table_exists: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
        )
        .fetch_one(&migration_pool).await?;
        let installed_version: i64 = if migration_table_exists > 0 {
            sqlx::query_scalar::<_, Option<i64>>("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
                .fetch_one(&migration_pool).await?.unwrap_or(0)
        } else { 0 };
        let target_version = MIGRATOR.migrations.iter().map(|migration| migration.version).max().unwrap_or(0);
        if existed && installed_version < target_version {
            let backup_dir = data_dir.join("backups");
            std::fs::create_dir_all(&backup_dir)?;
            let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
            let backup = backup_dir.join(format!("before-v{installed_version}-to-v{target_version}-{timestamp}.sqlite"));
            sqlx::query("VACUUM INTO ?").bind(backup.to_string_lossy().into_owned()).execute(&migration_pool).await?;
        }
        MIGRATOR.run(&migration_pool).await?;
        migration_pool.close().await;

        // Open application pool with foreign_keys = true for standard data integrity enforcement
        let options = SqliteConnectOptions::new()
            .filename(&database_path)
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(SqliteJournalMode::Wal);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;
        sqlx::query("PRAGMA foreign_key_check;").execute(&pool).await?;
        sqlx::query("UPDATE attendance SET telegram_status = 'PENDING' WHERE telegram_status = 'SENDING'")
            .execute(&pool).await?;
        let notification_pool = pool.clone();
        tauri::async_runtime::spawn(async move {
            let _ = retry_staff_alerts(&notification_pool).await;
        });
        let scheduler_pool = pool.clone();
        tauri::async_runtime::spawn(async move {
            run_auto_report_scheduler(scheduler_pool).await;
        });
        let backup_pool = pool.clone();
        let backup_data_dir = data_dir.clone();
        tauri::async_runtime::spawn(async move {
            run_auto_backup_scheduler(backup_pool, backup_data_dir).await;
        });
        Ok(Self {
            pool,
            sessions: Mutex::new(HashMap::new()),
            data_dir,
        })
    }

    fn user(&self, token: &str, admin: bool) -> Result<Session, String> {
        let sessions = self.sessions.lock().map_err(|_| "تعذر فتح الجلسة")?;
        let user = sessions.get(token).ok_or("انتهت الجلسة. سجّل الدخول مرة أخرى")?;
        if admin && user.role != "ADMIN" {
            return Err("هذه العملية متاحة للمدير فقط".into());
        }
        Ok(user.clone())
    }

    fn user_with_permission(&self, token: &str, required_page: &str) -> Result<Session, String> {
        let sessions = self.sessions.lock().map_err(|_| "تعذر فتح الجلسة")?;
        let user = sessions.get(token).ok_or("انتهت الجلسة. سجّل الدخول مرة أخرى")?;
        if user.role == "ADMIN" || user.permissions.iter().any(|p| p == required_page || (required_page == "attendance" && (p == "employees" || p == "main_cashier")) || (required_page == "inventory_audit" && p == "products")) {
            Ok(user.clone())
        } else {
            Err("ليس لديك صلاحية للوصول إلى هذه الصفحة أو العملية".into())
        }
    }
}

fn all_system_pages() -> Vec<String> {
    vec![
        "home".into(),
        "pos".into(),
        "invoices".into(),
        "returns".into(),
        "sales_report".into(),
        "sales_returns_report".into(),
        "products".into(),
        "inventory_audit".into(),
        "product_movement_report".into(),
        "barcode_print".into(),
        "categories".into(),
        "warehouses".into(),
        "suppliers".into(),
        "customers".into(),
        "employees".into(),
        "attendance".into(),
    ]
}

fn parse_user_permissions(role: &str, perms_str: Option<&str>) -> Vec<String> {
    if role == "ADMIN" {
        return all_system_pages();
    }
    if let Some(s) = perms_str {
        if let Ok(list) = serde_json::from_str::<Vec<String>>(s) {
            if !list.is_empty() {
                return list;
            }
        }
    }
    vec!["pos".into(), "invoices".into()]
}

fn db_error(error: sqlx::Error) -> String {
    if let sqlx::Error::Database(inner) = &error {
        if inner.is_unique_violation() {
            return "هذه البيانات موجودة بالفعل".into();
        }
        if inner.is_foreign_key_violation() {
            return "البيانات المرتبطة غير موجودة".into();
        }
    }
    format!("خطأ في قاعدة البيانات: {error}")
}

fn clean_name(name: &str) -> Result<&str, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err("الاسم مطلوب ولا يزيد عن 120 حرفًا".into());
    }
    Ok(name)
}

#[tauri::command]
pub async fn setup_required(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&state.pool)
        .await
        .map_err(db_error)?;
    Ok(count == 0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginUserChoice {
    pub username: String,
    pub display_name: String,
    pub role: String,
    pub job_title: Option<String>,
    pub is_main_seller: bool,
}

#[tauri::command]
pub async fn list_login_users(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LoginUserChoice>, String> {
    let rows = sqlx::query(
        "SELECT u.username, u.full_name, u.role, u.permissions, emp.name AS emp_name, emp.job_title
         FROM users u
         LEFT JOIN employees emp ON emp.user_id = u.id AND emp.is_active = 1
         WHERE u.is_active = 1
         ORDER BY CASE WHEN u.role = 'ADMIN' THEN 0 ELSE 1 END, COALESCE(emp.name, u.full_name) ASC"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let users = rows
        .into_iter()
        .map(|r| {
            let username: String = r.get("username");
            let full_name: String = r.get("full_name");
            let role: String = r.get("role");
            let emp_name: Option<String> = r.get("emp_name");
            let job_title_raw: Option<String> = r.get("job_title");
            let perms: Option<String> = r.get("permissions");
            let is_main_seller = perms.as_deref().map(|p| p.contains("main_cashier")).unwrap_or(false);
            let display_name = emp_name.unwrap_or(full_name);
            let job_title = job_title_raw.or_else(|| {
                if role == "ADMIN" {
                    Some("مدير النظام".into())
                } else if is_main_seller {
                    Some("كاشير عام".into())
                } else {
                    Some("بائع".into())
                }
            });

            LoginUserChoice {
                username,
                display_name,
                role,
                job_title,
                is_main_seller,
            }
        })
        .collect();

    Ok(users)
}

#[tauri::command]
pub async fn bootstrap_admin(
    state: tauri::State<'_, AppState>,
    username: String,
    full_name: String,
    password: String,
) -> Result<(), String> {
    let username = clean_name(&username)?;
    let full_name = clean_name(&full_name)?;
    if password.chars().count() < 10 {
        return Err("كلمة المرور يجب أن تكون 10 أحرف على الأقل".into());
    }
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| "تعذر حماية كلمة المرور")?
        .to_string();
    let inserted = sqlx::query(
        "INSERT INTO users(username, password_hash, full_name, role)
         SELECT ?, ?, ?, 'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM users)",
    )
    .bind(username)
    .bind(hash)
    .bind(full_name)
    .execute(&state.pool)
    .await
    .map_err(db_error)?;
    if inserted.rows_affected() == 0 {
        return Err("تم إنشاء حساب المدير بالفعل".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn login(
    state: tauri::State<'_, AppState>,
    username: String,
    password: String,
) -> Result<LoginResult, String> {
    let row = sqlx::query(
        "SELECT id, password_hash, full_name, role, permissions FROM users WHERE username = ? AND is_active = 1",
    )
    .bind(username.trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("اسم المستخدم أو كلمة المرور غير صحيحة")?;
    let hash: String = row.get("password_hash");
    let parsed = PasswordHash::new(&hash).map_err(|_| "تعذر قراءة كلمة المرور المحفوظة")?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| "اسم المستخدم أو كلمة المرور غير صحيحة")?;
    let token = Uuid::new_v4().to_string();
    let role: String = row.get("role");
    let perms_str: Option<String> = row.get("permissions");
    let permissions = parse_user_permissions(&role, perms_str.as_deref());
    let session = Session {
        user_id: row.get("id"),
        full_name: row.get("full_name"),
        role: role.clone(),
        permissions: permissions.clone(),
    };
    state
        .sessions
        .lock()
        .map_err(|_| "تعذر فتح الجلسة")?
        .insert(token.clone(), session.clone());
    Ok(LoginResult {
        token,
        user_id: session.user_id,
        full_name: session.full_name,
        role: session.role,
        permissions,
    })
}

#[tauri::command]
pub fn current_session(state: tauri::State<'_, AppState>, token: String) -> Result<LoginResult, String> {
    let user = state.user(&token, false)?;
    Ok(LoginResult {
        token,
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions,
    })
}

#[tauri::command]
pub fn logout(state: tauri::State<'_, AppState>, token: String) -> Result<(), String> {
    state
        .sessions
        .lock()
        .map_err(|_| "تعذر إغلاق الجلسة")?
        .remove(&token);
    Ok(())
}

#[tauri::command]
pub async fn dashboard(state: tauri::State<'_, AppState>, token: String) -> Result<Dashboard, String> {
    state.user_with_permission(&token, "home")?;

    let main_row = sqlx::query(
        "SELECT
          (SELECT COUNT(*) FROM products WHERE is_active = 1) AS product_count,
          (SELECT COUNT(*) FROM invoices WHERE status = 'COMPLETED') AS total_invoices_count,
          (SELECT COUNT(*) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = date('now', 'localtime')) AS today_invoices_count,
          (SELECT COALESCE(SUM(total_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = date('now', 'localtime')) AS today_gross_sales_piasters,
          (SELECT COALESCE(SUM(total_refund_piasters), 0) FROM refunds WHERE date(created_at, 'localtime') = date('now', 'localtime')) AS today_refunds_piasters,
          (SELECT COUNT(*) FROM refunds WHERE date(created_at, 'localtime') = date('now', 'localtime')) AS today_refunds_count,
          (SELECT COALESCE(SUM(remaining_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = date('now', 'localtime')) AS today_credit_sales_piasters,
          (SELECT COALESCE(SUM(amount_piasters), 0) FROM customer_payments WHERE date(created_at, 'localtime') = date('now', 'localtime')) AS today_debt_collected_piasters,
          (SELECT COALESCE(SUM(paid_cash_piasters + paid_instapay_piasters + paid_wallet_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = date('now', 'localtime')) AS today_invoice_collected_piasters,
          (SELECT COALESCE(SUM(total_refund_piasters), 0) FROM refunds WHERE date(created_at, 'localtime') = date('now', 'localtime') AND refund_method IN ('CASH', 'INSTAPAY', 'WALLET')) AS today_refunds_paid_out_piasters,
          (SELECT COUNT(*) FROM (
            SELECT COALESCE(SUM(b.quantity), 0) AS q
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
            LEFT JOIN inventory_balances b ON b.variant_id = v.id
            WHERE p.is_active = 1
            GROUP BY v.id
            UNION ALL
            SELECT COALESCE(SUM(b.quantity), 0) AS q
            FROM products p
            LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.variant_id IS NULL
            WHERE p.is_active = 1
              AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id)
            GROUP BY p.id
          ) WHERE q <= 0) AS out_of_stock_count,
          (SELECT COUNT(*) FROM (
            SELECT p.low_stock_threshold, COALESCE(SUM(b.quantity), 0) AS q
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
            LEFT JOIN inventory_balances b ON b.variant_id = v.id
            WHERE p.is_active = 1
            GROUP BY v.id
            UNION ALL
            SELECT p.low_stock_threshold, COALESCE(SUM(b.quantity), 0) AS q
            FROM products p
            LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.variant_id IS NULL
            WHERE p.is_active = 1
              AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id)
            GROUP BY p.id
          ) WHERE q > 0 AND q <= low_stock_threshold) AS low_stock_count,
          (SELECT COALESCE(SUM(remaining_piasters), 0) FROM invoices WHERE status = 'COMPLETED') AS total_customer_debt_piasters,
          (SELECT COUNT(DISTINCT customer_id) FROM invoices WHERE status = 'COMPLETED' AND remaining_piasters > 0 AND customer_id IS NOT NULL) AS customers_with_debt_count,
          (SELECT COALESCE(SUM(total_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = date('now', 'localtime', '-1 day')) AS yesterday_gross_sales_piasters,
          (SELECT COALESCE(SUM(total_refund_piasters), 0) FROM refunds WHERE date(created_at, 'localtime') = date('now', 'localtime', '-1 day')) AS yesterday_refunds_piasters",
    )
    .fetch_one(&state.pool)
    .await
    .map_err(db_error)?;

    let product_count: i64 = main_row.get("product_count");
    let total_invoices_count: i64 = main_row.get("total_invoices_count");
    let today_invoices_count: i64 = main_row.get("today_invoices_count");
    let today_gross_sales_piasters: i64 = main_row.get("today_gross_sales_piasters");
    let today_refunds_piasters: i64 = main_row.get("today_refunds_piasters");
    let today_refunds_count: i64 = main_row.get("today_refunds_count");
    let today_credit_sales_piasters: i64 = main_row.get("today_credit_sales_piasters");
    let today_debt_collected_piasters: i64 = main_row.get("today_debt_collected_piasters");
    let today_invoice_collected_piasters: i64 = main_row.get("today_invoice_collected_piasters");
    let today_refunds_paid_out_piasters: i64 = main_row.get("today_refunds_paid_out_piasters");
    let out_of_stock_count: i64 = main_row.get("out_of_stock_count");
    let low_stock_count: i64 = main_row.get("low_stock_count");
    let total_customer_debt_piasters: i64 = main_row.get("total_customer_debt_piasters");
    let customers_with_debt_count: i64 = main_row.get("customers_with_debt_count");
    let yesterday_gross_sales_piasters: i64 = main_row.get("yesterday_gross_sales_piasters");
    let yesterday_refunds_piasters: i64 = main_row.get("yesterday_refunds_piasters");

    let today_net_sales_piasters = today_gross_sales_piasters - today_refunds_piasters;
    let yesterday_net_sales_piasters = yesterday_gross_sales_piasters - yesterday_refunds_piasters;
    let today_collected_piasters = (today_invoice_collected_piasters + today_debt_collected_piasters) - today_refunds_paid_out_piasters;

    let trend_rows = sqlx::query(
        "WITH RECURSIVE dates(day) AS (
           SELECT date('now', 'localtime', '-6 days')
           UNION ALL
           SELECT date(day, '+1 day') FROM dates WHERE day < date('now', 'localtime')
         )
         SELECT
           dates.day AS date_str,
           strftime('%w', dates.day) AS day_of_week,
           COALESCE((SELECT SUM(total_piasters) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = dates.day), 0) AS gross_piasters,
           COALESCE((SELECT SUM(total_refund_piasters) FROM refunds WHERE date(created_at, 'localtime') = dates.day), 0) AS refunds_piasters,
           COALESCE((SELECT COUNT(*) FROM invoices WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = dates.day), 0) AS invoice_count
         FROM dates
         ORDER BY dates.day ASC",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let mut last_7_days = Vec::new();
    for row in trend_rows {
        let date_str: String = row.get("date_str");
        let day_of_week: String = row.get("day_of_week");
        let gross_piasters: i64 = row.get("gross_piasters");
        let refunds_piasters: i64 = row.get("refunds_piasters");
        let invoice_count: i64 = row.get("invoice_count");

        let day_name = match day_of_week.as_str() {
            "0" => "الأحد",
            "1" => "الإثنين",
            "2" => "الثلاثاء",
            "3" => "الأربعاء",
            "4" => "الخميس",
            "5" => "الجمعة",
            "6" => "السبت",
            _ => "",
        }
        .to_string();

        last_7_days.push(DaySalesSummary {
            date: date_str,
            day_name,
            gross_sales_piasters: gross_piasters,
            refunds_piasters,
            net_sales_piasters: gross_piasters - refunds_piasters,
            invoice_count,
        });
    }

    let refund_rows = sqlx::query(
        "SELECT r.id, r.refund_number, r.invoice_id, r.invoice_number, r.customer_id,
                c.name AS customer_name, r.seller_id, COALESCE(emp.name, u_seller.full_name) AS seller_name,
                u_perf.full_name AS performed_by_name, r.total_refund_piasters,
                r.refund_method, r.notes, r.created_at
         FROM refunds r
         LEFT JOIN customers c ON c.id = r.customer_id
         LEFT JOIN employees emp ON emp.id = r.employee_id
         JOIN users u_seller ON u_seller.id = r.seller_id
         JOIN users u_perf ON u_perf.id = r.performed_by
         ORDER BY r.id DESC LIMIT 5",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let recent_refunds = refund_rows
        .iter()
        .map(|row| RefundView {
            id: row.get("id"),
            refund_number: row.get("refund_number"),
            invoice_id: row.get("invoice_id"),
            invoice_number: row.get("invoice_number"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            seller_id: row.get("seller_id"),
            seller_name: row.get("seller_name"),
            performed_by_name: row.get("performed_by_name"),
            total_refund_piasters: row.get("total_refund_piasters"),
            refund_method: row.get("refund_method"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
        })
        .collect();

    let today_summary = PeriodSummary {
        gross_sales_piasters: today_gross_sales_piasters,
        refunds_piasters: today_refunds_piasters,
        refunds_count: today_refunds_count,
        net_sales_piasters: today_net_sales_piasters,
        collected_piasters: today_collected_piasters,
        credit_sales_piasters: today_credit_sales_piasters,
        debt_collected_piasters: today_debt_collected_piasters,
        invoices_count: today_invoices_count,
    };

    let week_summary = calc_period_summary(
        &state.pool,
        "date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')",
        "date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')",
    )
    .await
    .map_err(db_error)?;

    let month_summary = calc_period_summary(
        &state.pool,
        "strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')",
        "strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')",
    )
    .await
    .map_err(db_error)?;

    let all_time_summary = calc_period_summary(&state.pool, "1=1", "1=1")
        .await
        .map_err(db_error)?;

    Ok(Dashboard {
        product_count,
        total_invoices_count,
        today_invoices_count,
        today_gross_sales_piasters,
        today_refunds_piasters,
        today_refunds_count,
        today_net_sales_piasters,
        today_collected_piasters,
        today_credit_sales_piasters,
        today_debt_collected_piasters,
        out_of_stock_count,
        low_stock_count,
        total_customer_debt_piasters,
        customers_with_debt_count,
        yesterday_net_sales_piasters,
        last_7_days,
        recent_refunds,
        invoice_count: total_invoices_count,
        sales_today_piasters: today_net_sales_piasters,
        today: today_summary,
        week: week_summary,
        month: month_summary,
        all_time: all_time_summary,
    })
}

async fn calc_period_summary(
    pool: &SqlitePool,
    where_inv: &str,
    where_other: &str,
) -> Result<PeriodSummary, sqlx::Error> {
    let sql = format!(
        "SELECT
          (SELECT COUNT(*) FROM invoices WHERE status = 'COMPLETED' AND {where_inv}) AS invoices_count,
          (SELECT COALESCE(SUM(total_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND {where_inv}) AS gross_sales_piasters,
          (SELECT COALESCE(SUM(remaining_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND {where_inv}) AS credit_sales_piasters,
          (SELECT COALESCE(SUM(paid_cash_piasters + paid_instapay_piasters + paid_wallet_piasters), 0) FROM invoices WHERE status = 'COMPLETED' AND {where_inv}) AS invoice_collected_piasters,
          (SELECT COUNT(*) FROM refunds WHERE {where_other}) AS refunds_count,
          (SELECT COALESCE(SUM(total_refund_piasters), 0) FROM refunds WHERE {where_other}) AS refunds_piasters,
          (SELECT COALESCE(SUM(total_refund_piasters), 0) FROM refunds WHERE {where_other} AND refund_method IN ('CASH', 'INSTAPAY', 'WALLET')) AS refunds_paid_out_piasters,
          (SELECT COALESCE(SUM(amount_piasters), 0) FROM customer_payments WHERE {where_other}) AS debt_collected_piasters"
    );

    let row = sqlx::query(&sql).fetch_one(pool).await?;

    let invoices_count: i64 = row.get("invoices_count");
    let gross_sales_piasters: i64 = row.get("gross_sales_piasters");
    let credit_sales_piasters: i64 = row.get("credit_sales_piasters");
    let invoice_collected_piasters: i64 = row.get("invoice_collected_piasters");
    let refunds_count: i64 = row.get("refunds_count");
    let refunds_piasters: i64 = row.get("refunds_piasters");
    let refunds_paid_out_piasters: i64 = row.get("refunds_paid_out_piasters");
    let debt_collected_piasters: i64 = row.get("debt_collected_piasters");

    let net_sales_piasters = gross_sales_piasters - refunds_piasters;
    let collected_piasters = (invoice_collected_piasters + debt_collected_piasters) - refunds_paid_out_piasters;

    Ok(PeriodSummary {
        gross_sales_piasters,
        refunds_piasters,
        refunds_count,
        net_sales_piasters,
        collected_piasters,
        credit_sales_piasters,
        debt_collected_piasters,
        invoices_count,
    })
}

async fn list_named(pool: &SqlitePool, table: &str) -> Result<Vec<NamedRecord>, String> {
    let query = match table {
        "categories" => "SELECT id, name FROM categories ORDER BY name",
        "warehouses" => "SELECT id, name FROM warehouses ORDER BY name",
        "suppliers" => "SELECT id, name FROM suppliers ORDER BY name",
        _ => return Err("جدول غير مدعوم".into()),
    };
    let rows = sqlx::query(query).fetch_all(pool).await.map_err(db_error)?;
    Ok(rows
        .iter()
        .map(|row| NamedRecord {
            id: row.get("id"),
            name: row.get("name"),
        })
        .collect())
}

async fn create_named(pool: &SqlitePool, table: &str, name: String) -> Result<i64, String> {
    let name = clean_name(&name)?;
    let query = match table {
        "categories" => "INSERT INTO categories(name) VALUES (?)",
        "warehouses" => "INSERT INTO warehouses(name) VALUES (?)",
        "suppliers" => "INSERT INTO suppliers(name) VALUES (?)",
        _ => return Err("جدول غير مدعوم".into()),
    };
    Ok(sqlx::query(query)
        .bind(name)
        .execute(pool)
        .await
        .map_err(db_error)?
        .last_insert_rowid())
}

#[tauri::command]
pub async fn list_categories(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<NamedRecord>, String> {
    state.user(&token, false)?;
    list_named(&state.pool, "categories").await
}

#[tauri::command]
pub async fn create_category(state: tauri::State<'_, AppState>, token: String, name: String) -> Result<i64, String> {
    state.user(&token, true)?;
    create_named(&state.pool, "categories", name).await
}

#[tauri::command]
pub async fn list_warehouses(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<NamedRecord>, String> {
    state.user(&token, false)?;
    list_named(&state.pool, "warehouses").await
}

#[tauri::command]
pub async fn create_warehouse(state: tauri::State<'_, AppState>, token: String, name: String) -> Result<i64, String> {
    state.user(&token, true)?;
    create_named(&state.pool, "warehouses", name).await
}

#[tauri::command]
pub async fn list_suppliers(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<NamedRecord>, String> {
    state.user(&token, true)?;
    list_named(&state.pool, "suppliers").await
}

#[tauri::command]
pub async fn create_supplier(state: tauri::State<'_, AppState>, token: String, name: String) -> Result<i64, String> {
    state.user(&token, true)?;
    create_named(&state.pool, "suppliers", name).await
}

fn barcode(prefix: &str, id: i64) -> String {
    format!("{prefix}{id:011}")
}

#[tauri::command]
pub async fn create_product(
    state: tauri::State<'_, AppState>,
    token: String,
    input: ProductInput,
) -> Result<i64, String> {
    let user = state.user(&token, true)?;
    let name = clean_name(&input.name)?;
    if input.buy_price_piasters < 0 || input.sell_price_piasters < 0 || input.low_stock_threshold < 0 || input.opening_quantity < 0 {
        return Err("السعر والكمية وحد التحذير لا يمكن أن تكون سالبة".into());
    }
    if !input.variants.is_empty() && input.opening_quantity != 0 {
        return Err("كمية المنتج الإجمالية تُحسب من كميات المتغيرات".into());
    }
    let manual_barcode = input.barcode.as_deref().map(str::trim).filter(|b| !b.is_empty());
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    if let Some(code) = manual_barcode {
        if sqlx::query_scalar::<_, i64>(
            "SELECT 1 FROM products WHERE barcode = ? UNION SELECT 1 FROM product_variants WHERE barcode = ? LIMIT 1",
        )
        .bind(code)
        .bind(code)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .is_some()
        {
            return Err("الباركود مستخدم بالفعل".into());
        }
    }
    let temporary = format!("pending-{}", Uuid::new_v4());
    let prod_loc = input.location.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let product_id = sqlx::query(
        "INSERT INTO products(name, category_id, supplier_id, barcode, buy_price_piasters, sell_price_piasters, low_stock_threshold, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(name)
    .bind(input.category_id)
    .bind(input.supplier_id)
    .bind(temporary)
    .bind(input.buy_price_piasters)
    .bind(input.sell_price_piasters)
    .bind(input.low_stock_threshold)
    .bind(prod_loc)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?
    .last_insert_rowid();
    let product_barcode = manual_barcode.map(str::to_string).unwrap_or_else(|| barcode("20", product_id));
    sqlx::query("UPDATE products SET barcode = ? WHERE id = ?")
        .bind(&product_barcode)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    let entries: Vec<(Option<i64>, i64)> = if input.variants.is_empty() {
        vec![(None, input.opening_quantity)]
    } else {
        let mut entries = Vec::new();
        for variant in input.variants {
            let color = clean_name(&variant.color)?;
            let size = clean_name(&variant.size)?;
            let var_loc = variant.location.as_deref().map(str::trim).filter(|s| !s.is_empty());
            if variant.opening_quantity < 0 {
                return Err("كمية المتغير لا يمكن أن تكون سالبة".into());
            }
            let variant_id = sqlx::query(
                "INSERT INTO product_variants(product_id, color, size, location) VALUES (?, ?, ?, ?)",
            )
            .bind(product_id)
            .bind(color)
            .bind(size)
            .bind(var_loc)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?
            .last_insert_rowid();
            entries.push((Some(variant_id), variant.opening_quantity));
        }
        entries
    };
    for (variant_id, quantity) in entries {
        sqlx::query("INSERT INTO inventory_balances(product_id, variant_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)")
            .bind(product_id)
            .bind(variant_id)
            .bind(input.warehouse_id)
            .bind(quantity)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
        if quantity > 0 {
            sqlx::query("INSERT INTO inventory_movements(product_id, variant_id, warehouse_id, change_quantity, quantity_before, quantity_after, movement_type, reference_id, performed_by)
                         VALUES (?, ?, ?, ?, 0, ?, 'OPENING_BALANCE', ?, ?)")
                .bind(product_id)
                .bind(variant_id)
                .bind(input.warehouse_id)
                .bind(quantity)
                .bind(quantity)
                .bind(product_id)
                .bind(user.user_id)
                .execute(&mut *tx)
                .await
                .map_err(db_error)?;
        }
    }
    tx.commit().await.map_err(db_error)?;
    Ok(product_id)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVariantItem {
    pub variant_id: Option<i64>,
    pub color: String,
    pub size: String,
    pub quantity: i64,
    pub location: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProductInput {
    pub product_id: i64,
    pub name: String,
    pub buy_price_piasters: i64,
    pub sell_price_piasters: i64,
    pub low_stock_threshold: i64,
    pub barcode: Option<String>,
    pub warehouse_id: Option<i64>,
    pub location: Option<String>,
    pub quantity: Option<i64>,
    pub variants: Option<Vec<UpdateVariantItem>>,
}

#[tauri::command]
pub async fn update_product(
    state: tauri::State<'_, AppState>,
    token: String,
    input: UpdateProductInput,
) -> Result<(), String> {
    let user = state.user(&token, true)?;
    let name = clean_name(&input.name)?;
    if input.buy_price_piasters < 0 || input.sell_price_piasters < 0 || input.low_stock_threshold < 0 {
        return Err("السعر وحد التحذير لا يمكن أن تكون سالبة".into());
    }
    let code = input.barcode.as_deref().map(str::trim).filter(|b| !b.is_empty());
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    if let Some(c) = code {
        let duplicate = sqlx::query_scalar::<_, i64>(
            "SELECT 1 FROM products WHERE barcode = ? AND id != ? UNION SELECT 1 FROM product_variants WHERE barcode = ? LIMIT 1",
        )
        .bind(c)
        .bind(input.product_id)
        .bind(c)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .is_some();
        if duplicate {
            return Err("الباركود مستخدم بالفعل".into());
        }
    }
    let prod_loc = input.location.as_deref().map(str::trim).filter(|s| !s.is_empty());
    sqlx::query(
        "UPDATE products SET name = ?, buy_price_piasters = ?, sell_price_piasters = ?, low_stock_threshold = ?, barcode = COALESCE(?, barcode), location = ? WHERE id = ?"
    )
    .bind(name)
    .bind(input.buy_price_piasters)
    .bind(input.sell_price_piasters)
    .bind(input.low_stock_threshold)
    .bind(code)
    .bind(prod_loc)
    .bind(input.product_id)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?;

    if let Some(w_id) = input.warehouse_id {
        sqlx::query("UPDATE inventory_balances SET warehouse_id = ? WHERE product_id = ?")
            .bind(w_id)
            .bind(input.product_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
    }

    let existing_w = sqlx::query_scalar::<_, i64>(
        "SELECT warehouse_id FROM inventory_balances WHERE product_id = ? LIMIT 1"
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(db_error)?;

    let default_warehouse_id = input.warehouse_id.or(existing_w).unwrap_or(1);

    let is_simple_product = match &input.variants {
        None => true,
        Some(vars) => vars.is_empty(),
    };

    if is_simple_product {
        let qty = input.quantity.unwrap_or(0).max(0);

        let updated_count = sqlx::query(
            "UPDATE inventory_balances SET quantity = ?, warehouse_id = ? WHERE product_id = ? AND variant_id IS NULL"
        )
        .bind(qty)
        .bind(default_warehouse_id)
        .bind(input.product_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?
        .rows_affected();

        if updated_count == 0 {
            sqlx::query(
                "INSERT INTO inventory_balances(product_id, variant_id, warehouse_id, quantity) VALUES (?, NULL, ?, ?)"
            )
            .bind(input.product_id)
            .bind(default_warehouse_id)
            .bind(qty)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
        }

        // Clean up any remaining non-null variant balances for this product
        sqlx::query("DELETE FROM inventory_balances WHERE product_id = ? AND variant_id IS NOT NULL")
            .bind(input.product_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
    } else if let Some(variants) = input.variants {
        // Remove any null-variant balance because this product now has variants
        sqlx::query("DELETE FROM inventory_balances WHERE product_id = ? AND variant_id IS NULL")
            .bind(input.product_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;

        let mut kept_variant_ids: Vec<i64> = Vec::new();

        for var in variants {
            let color = clean_name(&var.color).unwrap_or("افتراضي");
            let size = clean_name(&var.size).unwrap_or("عام");
            let qty = var.quantity.max(0);
            let var_loc = var.location.as_deref().map(str::trim).filter(|s| !s.is_empty());

            if let Some(v_id) = var.variant_id {
                sqlx::query("UPDATE product_variants SET color = ?, size = ?, location = ? WHERE id = ? AND product_id = ?")
                    .bind(&color)
                    .bind(&size)
                    .bind(var_loc)
                    .bind(v_id)
                    .bind(input.product_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(db_error)?;

                let updated_count = sqlx::query("UPDATE inventory_balances SET quantity = ? WHERE product_id = ? AND variant_id = ?")
                    .bind(qty)
                    .bind(input.product_id)
                    .bind(v_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(db_error)?
                    .rows_affected();

                if updated_count == 0 {
                    sqlx::query("INSERT INTO inventory_balances(product_id, variant_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)")
                        .bind(input.product_id)
                        .bind(v_id)
                        .bind(default_warehouse_id)
                        .bind(qty)
                        .execute(&mut *tx)
                        .await
                        .map_err(db_error)?;
                }
                kept_variant_ids.push(v_id);
            } else {
                let existing_v_id = sqlx::query_scalar::<_, i64>(
                    "SELECT id FROM product_variants WHERE product_id = ? AND color = ? AND size = ?"
                )
                .bind(input.product_id)
                .bind(&color)
                .bind(&size)
                .fetch_optional(&mut *tx)
                .await
                .map_err(db_error)?;

                let target_v_id = if let Some(eid) = existing_v_id {
                    sqlx::query("UPDATE product_variants SET location = ? WHERE id = ?")
                        .bind(var_loc)
                        .bind(eid)
                        .execute(&mut *tx)
                        .await
                        .map_err(db_error)?;
                    eid
                } else {
                    sqlx::query("INSERT INTO product_variants(product_id, color, size, location) VALUES (?, ?, ?, ?)")
                        .bind(input.product_id)
                        .bind(&color)
                        .bind(&size)
                        .bind(var_loc)
                        .execute(&mut *tx)
                        .await
                        .map_err(db_error)?
                        .last_insert_rowid()
                };

                let updated_count = sqlx::query("UPDATE inventory_balances SET quantity = ? WHERE product_id = ? AND variant_id = ?")
                    .bind(qty)
                    .bind(input.product_id)
                    .bind(target_v_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(db_error)?
                    .rows_affected();

                if updated_count == 0 {
                    sqlx::query("INSERT INTO inventory_balances(product_id, variant_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)")
                        .bind(input.product_id)
                        .bind(target_v_id)
                        .bind(default_warehouse_id)
                        .bind(qty)
                        .execute(&mut *tx)
                        .await
                        .map_err(db_error)?;
                }
                kept_variant_ids.push(target_v_id);
            }
        }

        if !kept_variant_ids.is_empty() {
            let mut query_builder = sqlx::QueryBuilder::new("DELETE FROM inventory_balances WHERE product_id = ");
            query_builder.push_bind(input.product_id);
            query_builder.push(" AND variant_id IS NOT NULL AND variant_id NOT IN (");
            let mut separated = query_builder.separated(", ");
            for id in kept_variant_ids {
                separated.push_bind(id);
            }
            query_builder.push(")");
            query_builder.build().execute(&mut *tx).await.map_err(db_error)?;
        }
    }

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'PRODUCT_UPDATE', 'products', ?)")
        .bind(user.user_id)
        .bind(input.product_id)

        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_product(
    state: tauri::State<'_, AppState>,
    token: String,
    product_id: i64,
) -> Result<(), String> {
    let user = state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    sqlx::query("UPDATE products SET barcode = barcode || '_deleted_' || id, is_active = 0 WHERE id = ?")
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    sqlx::query("UPDATE product_variants SET barcode = barcode || '_deleted_' || id WHERE product_id = ? AND barcode IS NOT NULL")
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'PRODUCT_DELETE', 'products', ?)")
        .bind(user.user_id)
        .bind(product_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn list_products(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<ProductView>, String> {
    state.user(&token, false)?;
    let rows = sqlx::query(
        "SELECT p.id AS product_id, v.id AS variant_id, b.warehouse_id, p.name, c.name AS category, w.name AS warehouse,
                p.supplier_id, s.name AS supplier,
                v.color, v.size, p.barcode AS barcode, b.quantity,
                p.buy_price_piasters, p.sell_price_piasters, p.low_stock_threshold,
                COALESCE(v.location, p.location) AS location
         FROM inventory_balances b
         JOIN products p ON p.id = b.product_id
         JOIN categories c ON c.id = p.category_id
         JOIN warehouses w ON w.id = b.warehouse_id
         LEFT JOIN suppliers s ON s.id = p.supplier_id
         LEFT JOIN product_variants v ON v.id = b.variant_id
         WHERE p.is_active = 1 ORDER BY p.name, v.color, v.size",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;
    Ok(rows.iter().map(|r| ProductView {
        product_id: r.get("product_id"), variant_id: r.get("variant_id"), warehouse_id: r.get("warehouse_id"),
        supplier_id: r.get("supplier_id"), supplier: r.get("supplier"),
        name: r.get("name"), category: r.get("category"), warehouse: r.get("warehouse"), color: r.get("color"),
        size: r.get("size"), barcode: r.get("barcode"), quantity: r.get("quantity"),
        buy_price_piasters: r.get("buy_price_piasters"), sell_price_piasters: r.get("sell_price_piasters"),
        low_stock_threshold: r.get("low_stock_threshold"),
        location: r.get("location"),
    }).collect())
}

#[tauri::command]
pub async fn create_sale(
    state: tauri::State<'_, AppState>, token: String, input: SaleInput,
) -> Result<SaleResult, String> {
    let user = state.user(&token, false)?;
    if input.lines.is_empty() { return Err("أضف منتجًا واحدًا على الأقل للفاتورة".into()); }
    if [input.paid_cash_piasters, input.paid_instapay_piasters, input.paid_wallet_piasters].iter().any(|v| *v < 0) {
        return Err("المبالغ المدفوعة لا يمكن أن تكون سالبة".into());
    }
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let mut subtotal = 0_i64;
    let mut items_discount = 0_i64;
    let mut resolved = Vec::new();
    for line in &input.lines {
        if line.quantity <= 0 || line.discount_each_piasters < 0 { return Err("الكمية أو الخصم غير صحيح".into()); }
        let row = sqlx::query(
            "SELECT b.id AS balance_id, b.quantity AS stock, p.name, p.buy_price_piasters, p.sell_price_piasters
             FROM inventory_balances b JOIN products p ON p.id = b.product_id
             WHERE b.product_id = ? AND b.variant_id IS ? AND b.warehouse_id = ? AND p.is_active = 1",
        )
        .bind(line.product_id).bind(line.variant_id).bind(line.warehouse_id)
        .fetch_optional(&mut *tx).await.map_err(db_error)?
        .ok_or("المنتج أو المتغير غير موجود في المخزن")?;
        let stock: i64 = row.get("stock");
        if stock < line.quantity { return Err(format!("الكمية المتاحة أقل من المطلوبة: {}", row.get::<String, _>("name"))); }
        let price = line.sell_price_piasters.unwrap_or_else(|| row.get("sell_price_piasters"));
        if price < 0 || line.discount_each_piasters > price { return Err("سعر البيع أو الخصم غير صحيح".into()); }
        let name = match &line.name_override { Some(value) => clean_name(value)?.to_owned(), None => row.get("name") };
        subtotal = subtotal.checked_add(price.checked_mul(line.quantity).ok_or("قيمة الفاتورة كبيرة جدًا")?).ok_or("قيمة الفاتورة كبيرة جدًا")?;
        items_discount = items_discount.checked_add(line.discount_each_piasters.checked_mul(line.quantity).ok_or("قيمة الخصم كبيرة جدًا")?).ok_or("قيمة الخصم كبيرة جدًا")?;
        resolved.push((row.get::<i64, _>("balance_id"), stock, name, row.get::<i64, _>("buy_price_piasters"), price));
    }
    let extra_discount = input.extra_discount_piasters.unwrap_or(0);
    if extra_discount < 0 {
        return Err("قيمة خصم الفاتورة لا يمكن أن تكون سالبة".into());
    }
    let discount = items_discount.checked_add(extra_discount).ok_or("قيمة الخصم كبيرة جدًا")?;
    if discount > subtotal {
        return Err("إجمالي الخصم لا يمكن أن يتجاوز مجموع الفاتورة".into());
    }
    let total = subtotal - discount;
    let paid = input.paid_cash_piasters.checked_add(input.paid_instapay_piasters)
        .and_then(|v| v.checked_add(input.paid_wallet_piasters)).ok_or("المبلغ المدفوع كبير جدًا")?;
    if paid > total { return Err("المبلغ المدفوع أكبر من إجمالي الفاتورة".into()); }
    let remaining = total - paid;
    let customer_name = input.customer_name.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let customer_phone = input.customer_phone.as_deref().map(str::trim).filter(|s| !s.is_empty());
    if customer_name.is_some() != customer_phone.is_some() {
        return Err("أدخل اسم العميل ورقم هاتفه معًا، أو اتركهما فارغين للبيع بدون عميل".into());
    }
    if remaining > 0 && customer_name.is_none() {
        return Err("البيع الآجل يحتاج اسم العميل ورقم هاتفه".into());
    }
    let customer_id: Option<i64> = if let Some(name) = customer_name {
        let name = clean_name(name)?;
        if let Some(phone) = customer_phone {
            let phone = clean_customer_phone(phone)?;
            if let Some(existing) = sqlx::query_scalar::<_, i64>("SELECT id FROM customers WHERE phone = ?")
                .bind(&phone).fetch_optional(&mut *tx).await.map_err(db_error)? { Some(existing) }
            else { Some(sqlx::query("INSERT INTO customers(name, phone) VALUES (?, ?)")
                .bind(name).bind(&phone).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid()) }
        } else { Some(sqlx::query("INSERT INTO customers(name) VALUES (?)")
            .bind(name).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid()) }
    } else { None };
    let (seller_id, employee_id) = match input.employee_id {
        Some(emp_id) if emp_id > 0 => {
            let u_id: Option<i64> = sqlx::query_scalar("SELECT user_id FROM employees WHERE id = ?")
                .bind(emp_id).fetch_optional(&mut *tx).await.map_err(db_error)?.flatten();
            (u_id.unwrap_or(user.user_id), Some(emp_id))
        }
        _ => match input.seller_id {
            Some(id) if id > 0 => {
                let emp_id: Option<i64> = sqlx::query_scalar("SELECT id FROM employees WHERE user_id = ?")
                    .bind(id).fetch_optional(&mut *tx).await.map_err(db_error)?;
                (id, emp_id)
            }
            _ => {
                let emp_id: Option<i64> = sqlx::query_scalar("SELECT id FROM employees WHERE user_id = ?")
                    .bind(user.user_id).fetch_optional(&mut *tx).await.map_err(db_error)?;
                (user.user_id, emp_id)
            }
        },
    };
    let number = sqlx::query("INSERT INTO invoice_sequence DEFAULT VALUES")
        .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    let invoice_id = sqlx::query(
        "INSERT INTO invoices(invoice_number, customer_id, seller_id, employee_id, created_by, subtotal_piasters, discount_piasters, extra_discount_piasters, total_piasters,
          paid_cash_piasters, paid_instapay_piasters, paid_wallet_piasters, remaining_piasters, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(number).bind(customer_id).bind(seller_id).bind(employee_id).bind(user.user_id)
    .bind(subtotal).bind(discount).bind(extra_discount).bind(total).bind(input.paid_cash_piasters)
    .bind(input.paid_instapay_piasters).bind(input.paid_wallet_piasters).bind(remaining)
    .bind(input.notes.as_deref().map(str::trim))
    .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    for (line, (balance_id, _stock, name, buy_price, sell_price)) in input.lines.iter().zip(resolved) {
        let line_total = (sell_price - line.discount_each_piasters) * line.quantity;
        sqlx::query(
            "INSERT INTO invoice_items(invoice_id, product_id, variant_id, warehouse_id, name_snapshot,
             buy_price_piasters, sell_price_piasters, discount_each_piasters, quantity, line_total_piasters)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(invoice_id).bind(line.product_id).bind(line.variant_id).bind(line.warehouse_id)
        .bind(name).bind(buy_price).bind(sell_price).bind(line.discount_each_piasters)
        .bind(line.quantity).bind(line_total).execute(&mut *tx).await.map_err(db_error)?;
        let quantity_before: i64 = sqlx::query_scalar("SELECT quantity FROM inventory_balances WHERE id = ?")
            .bind(balance_id).fetch_one(&mut *tx).await.map_err(db_error)?;
        let updated = sqlx::query("UPDATE inventory_balances SET quantity = quantity - ? WHERE id = ? AND quantity >= ?")
            .bind(line.quantity).bind(balance_id).bind(line.quantity)
            .execute(&mut *tx).await.map_err(db_error)?;
        if updated.rows_affected() != 1 { return Err("تغير المخزون أثناء البيع. أعد تحميل المنتجات".into()); }
        sqlx::query("INSERT INTO inventory_movements(product_id, variant_id, warehouse_id, change_quantity, quantity_before, quantity_after, movement_type, reference_id, performed_by)
                     VALUES (?, ?, ?, ?, ?, ?, 'SALE', ?, ?)")
            .bind(line.product_id).bind(line.variant_id).bind(line.warehouse_id).bind(-line.quantity)
            .bind(quantity_before).bind(quantity_before - line.quantity).bind(invoice_id).bind(user.user_id)
            .execute(&mut *tx).await.map_err(db_error)?;
    }
    tx.commit().await.map_err(db_error)?;
    Ok(SaleResult { invoice_number: number, total_piasters: total, remaining_piasters: remaining })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceItemDetail {
    id: i64,
    product_id: i64,
    variant_id: Option<i64>,
    warehouse_id: i64,
    name_snapshot: String,
    color: Option<String>,
    size: Option<String>,
    warehouse_name: String,
    buy_price_piasters: i64,
    sell_price_piasters: i64,
    discount_each_piasters: i64,
    quantity: i64,
    line_total_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceDetailView {
    id: i64,
    invoice_number: i64,
    created_at: String,
    status: String,
    customer_name: Option<String>,
    customer_phone: Option<String>,
    seller_name: String,
    subtotal_piasters: i64,
    discount_piasters: i64,
    extra_discount_piasters: i64,
    shipping_fee_piasters: i64,
    deposit_piasters: i64,
    online_order_number: Option<i64>,
    total_piasters: i64,
    paid_cash_piasters: i64,
    paid_instapay_piasters: i64,
    paid_wallet_piasters: i64,
    remaining_piasters: i64,
    notes: Option<String>,
    items: Vec<InvoiceItemDetail>,
}

#[tauri::command]
pub async fn list_invoices(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<InvoiceView>, String> {
    state.user(&token, false)?;
    let rows = sqlx::query(
        "SELECT i.invoice_number, c.name AS customer_name, COALESCE(emp.name, u.full_name) AS seller_name,
                i.subtotal_piasters, i.discount_piasters, i.total_piasters,
                i.paid_cash_piasters, i.paid_instapay_piasters, i.paid_wallet_piasters,
                i.remaining_piasters, i.created_at, i.status,
                oo.order_number AS online_order_number,
                COALESCE(oo.shipping_fee_piasters, 0) AS shipping_fee_piasters,
                COALESCE(oo.deposit_piasters, 0) AS deposit_piasters
         FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
         LEFT JOIN employees emp ON emp.id = i.employee_id
         JOIN users u ON u.id = i.seller_id
         LEFT JOIN online_orders oo ON oo.invoice_id = i.id
         ORDER BY i.id DESC LIMIT 1000",
    )
    .fetch_all(&state.pool).await.map_err(db_error)?;
    Ok(rows.iter().map(|r| InvoiceView {
        invoice_number: r.get("invoice_number"), customer_name: r.get("customer_name"),
        seller_name: r.get("seller_name"), subtotal_piasters: r.get("subtotal_piasters"),
        discount_piasters: r.get("discount_piasters"), total_piasters: r.get("total_piasters"),
        paid_cash_piasters: r.get("paid_cash_piasters"), paid_instapay_piasters: r.get("paid_instapay_piasters"),
        paid_wallet_piasters: r.get("paid_wallet_piasters"), remaining_piasters: r.get("remaining_piasters"),
        created_at: r.get("created_at"), status: r.get("status"),
        online_order_number: r.get("online_order_number"),
        shipping_fee_piasters: r.get("shipping_fee_piasters"),
        deposit_piasters: r.get("deposit_piasters"),
    }).collect())
}

#[tauri::command]
pub async fn get_invoice_details(
    state: tauri::State<'_, AppState>,
    token: String,
    invoice_number: i64,
) -> Result<InvoiceDetailView, String> {
    state.user(&token, false)?;
    let row = sqlx::query(
        "SELECT i.id, i.invoice_number, i.created_at, i.status, c.name AS customer_name,
                c.phone AS customer_phone, COALESCE(emp.name, u.full_name) AS seller_name,
                i.subtotal_piasters, i.discount_piasters, COALESCE(i.extra_discount_piasters, 0) AS extra_discount_piasters, i.total_piasters,
                i.paid_cash_piasters, i.paid_instapay_piasters, i.paid_wallet_piasters,
                i.remaining_piasters, i.notes,
                oo.order_number AS online_order_number,
                COALESCE(oo.shipping_fee_piasters, 0) AS shipping_fee_piasters,
                COALESCE(oo.deposit_piasters, 0) AS deposit_piasters
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id
         LEFT JOIN employees emp ON emp.id = i.employee_id
         JOIN users u ON u.id = i.seller_id
         LEFT JOIN online_orders oo ON oo.invoice_id = i.id
         WHERE i.invoice_number = ?",
    )
    .bind(invoice_number)
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("الفاتورة غير موجودة")?;

    let invoice_id: i64 = row.get("id");

    let item_rows = sqlx::query(
        "SELECT ii.id, ii.product_id, ii.variant_id, ii.warehouse_id, ii.name_snapshot, v.color, v.size, w.name AS warehouse_name,
                ii.buy_price_piasters, ii.sell_price_piasters, ii.discount_each_piasters,
                ii.quantity, ii.line_total_piasters
         FROM invoice_items ii
         JOIN warehouses w ON w.id = ii.warehouse_id
         LEFT JOIN product_variants v ON v.id = ii.variant_id
         WHERE ii.invoice_id = ?
         ORDER BY ii.id ASC",
    )
    .bind(invoice_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let items = item_rows
        .iter()
        .map(|r| InvoiceItemDetail {
            id: r.get("id"),
            product_id: r.get("product_id"),
            variant_id: r.get("variant_id"),
            warehouse_id: r.get("warehouse_id"),
            name_snapshot: r.get("name_snapshot"),
            color: r.get("color"),
            size: r.get("size"),
            warehouse_name: r.get("warehouse_name"),
            buy_price_piasters: r.get("buy_price_piasters"),
            sell_price_piasters: r.get("sell_price_piasters"),
            discount_each_piasters: r.get("discount_each_piasters"),
            quantity: r.get("quantity"),
            line_total_piasters: r.get("line_total_piasters"),
        })
        .collect();

    Ok(InvoiceDetailView {
        id: invoice_id,
        invoice_number: row.get("invoice_number"),
        created_at: row.get("created_at"),
        status: row.get("status"),
        customer_name: row.get("customer_name"),
        customer_phone: row.get("customer_phone"),
        seller_name: row.get("seller_name"),
        subtotal_piasters: row.get("subtotal_piasters"),
        discount_piasters: row.get("discount_piasters"),
        extra_discount_piasters: row.get("extra_discount_piasters"),
        shipping_fee_piasters: row.get("shipping_fee_piasters"),
        deposit_piasters: row.get("deposit_piasters"),
        online_order_number: row.get("online_order_number"),
        total_piasters: row.get("total_piasters"),
        paid_cash_piasters: row.get("paid_cash_piasters"),
        paid_instapay_piasters: row.get("paid_instapay_piasters"),
        paid_wallet_piasters: row.get("paid_wallet_piasters"),
        remaining_piasters: row.get("remaining_piasters"),
        notes: row.get("notes"),
        items,
    })
}

#[tauri::command]
pub async fn list_employees(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<EmployeeView>, String> {
    state.user(&token, false)?;
    let rows = sqlx::query(
        "SELECT e.id, e.user_id, e.name, u.username, u.permissions, e.phone, e.job_title, e.address, e.work_hours,
                e.hire_date, e.base_salary_piasters, e.shift_start, e.shift_end
         FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.is_active = 1 ORDER BY e.id DESC",
    ).fetch_all(&state.pool).await.map_err(db_error)?;
    Ok(rows.iter().map(|r| {
        let perms_str: Option<String> = r.get("permissions");
        let permissions = perms_str
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            .unwrap_or_default();
        EmployeeView {
            id: r.get("id"),
            user_id: r.get("user_id"),
            name: r.get("name"),
            username: r.get("username"),
            permissions,
            phone: r.get("phone"),
            job_title: r.get("job_title"),
            address: r.get("address"),
            work_hours: r.get("work_hours"),
            hire_date: r.get("hire_date"),
            base_salary_piasters: r.get("base_salary_piasters"),
            shift_start: r.get("shift_start"),
            shift_end: r.get("shift_end"),
        }
    }).collect())
}

#[tauri::command]
pub async fn get_employee_stats(
    state: tauri::State<'_, AppState>,
    token: String,
    employee_id: i64,
) -> Result<EmployeeStatsView, String> {
    state.user(&token, true)?;

    let emp_user_id: Option<i64> = sqlx::query_scalar("SELECT user_id FROM employees WHERE id = ?")
        .bind(employee_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(db_error)?
        .flatten();
    let u_id = emp_user_id.unwrap_or(-999999);

    let completed_row = sqlx::query(
        "SELECT COUNT(*) AS cnt,
                COALESCE(SUM(subtotal_piasters), 0) AS subtotal,
                COALESCE(SUM(discount_piasters), 0) AS discount,
                COALESCE(SUM(total_piasters), 0) AS total,
                COALESCE(SUM(paid_cash_piasters), 0) AS paid_cash,
                COALESCE(SUM(paid_instapay_piasters), 0) AS paid_instapay,
                COALESCE(SUM(paid_wallet_piasters), 0) AS paid_wallet,
                COALESCE(SUM(remaining_piasters), 0) AS remaining
         FROM invoices
         WHERE (employee_id = ? OR (employee_id IS NULL AND seller_id = ?)) AND status = 'COMPLETED'"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_one(&state.pool)
    .await
    .map_err(db_error)?;

    let cancelled_row = sqlx::query(
        "SELECT COUNT(*) AS cnt, COALESCE(SUM(total_piasters), 0) AS total
         FROM invoices
         WHERE (employee_id = ? OR (employee_id IS NULL AND seller_id = ?)) AND status = 'CANCELLED'"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_one(&state.pool)
    .await
    .map_err(db_error)?;

    let refund_summary_row = sqlx::query(
        "SELECT COUNT(*) AS cnt,
                COALESCE(SUM(total_refund_piasters), 0) AS total_refund,
                COALESCE(SUM(CASE WHEN refund_method = 'CASH' THEN total_refund_piasters ELSE 0 END), 0) AS refund_cash,
                COALESCE(SUM(CASE WHEN refund_method = 'INSTAPAY' THEN total_refund_piasters ELSE 0 END), 0) AS refund_instapay,
                COALESCE(SUM(CASE WHEN refund_method = 'WALLET' THEN total_refund_piasters ELSE 0 END), 0) AS refund_wallet,
                COALESCE(SUM(CASE WHEN refund_method = 'DEBT_DEDUCTION' THEN total_refund_piasters ELSE 0 END), 0) AS refund_debt
         FROM refunds
         WHERE (employee_id = ? OR (employee_id IS NULL AND seller_id = ?))"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_one(&state.pool)
    .await
    .map_err(db_error)?;

    let gross_sales: i64 = completed_row.get("total");
    let gross_subtotal: i64 = completed_row.get("subtotal");
    let gross_discount: i64 = completed_row.get("discount");
    let gross_cash: i64 = completed_row.get("paid_cash");
    let gross_instapay: i64 = completed_row.get("paid_instapay");
    let gross_wallet: i64 = completed_row.get("paid_wallet");
    let gross_remaining: i64 = completed_row.get("remaining");

    let refund_total: i64 = refund_summary_row.get("total_refund");
    let refund_cash: i64 = refund_summary_row.get("refund_cash");
    let refund_instapay: i64 = refund_summary_row.get("refund_instapay");
    let refund_wallet: i64 = refund_summary_row.get("refund_wallet");
    let refund_debt: i64 = refund_summary_row.get("refund_debt");

    let net_total_sales = gross_sales - refund_total;
    let net_paid_cash = (gross_cash - refund_cash).max(0);
    let net_paid_instapay = (gross_instapay - refund_instapay).max(0);
    let net_paid_wallet = (gross_wallet - refund_wallet).max(0);
    let net_remaining = (gross_remaining - refund_debt).max(0);

    let top_product_rows = sqlx::query(
        "SELECT ii.name_snapshot, v.color, v.size,
                (SUM(ii.quantity) - COALESCE(SUM(ri.quantity), 0)) AS net_qty,
                (SUM(ii.line_total_piasters) - COALESCE(SUM(ri.refund_total_piasters), 0)) AS net_total
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         LEFT JOIN product_variants v ON v.id = ii.variant_id
         LEFT JOIN (
             SELECT ri_inner.invoice_item_id,
                    SUM(ri_inner.quantity) AS quantity,
                    SUM(ri_inner.line_total_piasters) AS refund_total_piasters
             FROM refund_items ri_inner
             GROUP BY ri_inner.invoice_item_id
         ) ri ON ri.invoice_item_id = ii.id
         WHERE (i.employee_id = ? OR (i.employee_id IS NULL AND i.seller_id = ?)) AND i.status IN ('COMPLETED', 'CANCELLED')
         GROUP BY ii.name_snapshot, v.color, v.size
         HAVING net_qty > 0
         ORDER BY net_qty DESC
         LIMIT 15"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let top_products = top_product_rows.iter().map(|r| EmployeeProductStat {
        name: r.get("name_snapshot"),
        color: r.get("color"),
        size: r.get("size"),
        quantity: r.get("net_qty"),
        total_piasters: r.get("net_total"),
    }).collect();

    let discount_rows = sqlx::query(
        "SELECT i.invoice_number, c.name AS customer_name, i.discount_piasters,
                i.total_piasters, i.created_at
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE (i.employee_id = ? OR (i.employee_id IS NULL AND i.seller_id = ?)) AND i.discount_piasters > 0 AND i.status = 'COMPLETED'
         ORDER BY i.id DESC
         LIMIT 50"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let discounts_given = discount_rows.iter().map(|r| EmployeeDiscountDetail {
        invoice_number: r.get("invoice_number"),
        customer_name: r.get("customer_name"),
        discount_piasters: r.get("discount_piasters"),
        total_piasters: r.get("total_piasters"),
        created_at: r.get("created_at"),
    }).collect();

    let refund_detail_rows = sqlx::query(
        "SELECT r.refund_number, i.invoice_number, c.name AS customer_name,
                r.total_refund_piasters, r.refund_method, r.notes, r.created_at
         FROM refunds r
         JOIN invoices i ON i.id = r.invoice_id
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE (r.employee_id = ? OR (r.employee_id IS NULL AND r.seller_id = ?))
         ORDER BY r.id DESC
         LIMIT 50"
    )
    .bind(employee_id)
    .bind(u_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let refunds_list = refund_detail_rows.iter().map(|r| EmployeeRefundDetail {
        refund_number: r.get("refund_number"),
        invoice_number: r.get("invoice_number"),
        customer_name: r.get("customer_name"),
        total_refund_piasters: r.get("total_refund_piasters"),
        refund_method: r.get("refund_method"),
        notes: r.get("notes"),
        created_at: r.get("created_at"),
    }).collect();

    Ok(EmployeeStatsView {
        completed_invoices_count: completed_row.get("cnt"),
        cancelled_invoices_count: cancelled_row.get("cnt"),
        subtotal_sales_piasters: gross_subtotal,
        discount_sales_piasters: gross_discount,
        total_sales_piasters: net_total_sales,
        gross_sales_piasters: gross_sales,
        refund_sales_piasters: refund_total,
        refund_count: refund_summary_row.get("cnt"),
        paid_cash_piasters: net_paid_cash,
        paid_instapay_piasters: net_paid_instapay,
        paid_wallet_piasters: net_paid_wallet,
        remaining_piasters: net_remaining,
        top_products,
        discounts_given,
        refunds_list,
    })
}

#[tauri::command]
pub async fn create_employee(
    state: tauri::State<'_, AppState>, token: String, input: EmployeeInput,
) -> Result<i64, String> {
    let admin = state.user(&token, true)?;
    let name = clean_name(&input.name)?;
    let raw_job = input.job_title.trim();
    let job_title = if raw_job.is_empty() {
        "بائع"
    } else {
        clean_name(raw_job)?
    };
    let work_hours = if input.work_hours < 1 || input.work_hours > 24 { 8 } else { input.work_hours };
    let base_salary_piasters = if input.base_salary_piasters < 0 { 0 } else { input.base_salary_piasters };
    let hire_date = if input.hire_date.trim().len() != 10 {
        chrono::Local::now().format("%Y-%m-%d").to_string()
    } else {
        input.hire_date.trim().to_string()
    };
    let shift_start = if input.shift_start.trim().len() != 5 { "09:00".to_string() } else { input.shift_start.trim().to_string() };
    let shift_end = if input.shift_end.trim().len() != 5 { "17:00".to_string() } else { input.shift_end.trim().to_string() };

    let mut tx = state.pool.begin().await.map_err(db_error)?;

    let user_id = if let Some(raw_u) = input.username.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        let username = clean_name(raw_u)?;
        sqlx::query("UPDATE users SET username = username || '_deleted_' || id WHERE username = ? AND is_active = 0")
            .bind(username).execute(&mut *tx).await.map_err(db_error)?;
        let pwd = input.password.as_deref().unwrap_or("").trim();
        if pwd.chars().count() < 10 {
            return Err("كلمة المرور يجب أن تكون 10 أحرف على الأقل".into());
        }
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default().hash_password(pwd.as_bytes(), &salt)
            .map_err(|_| "تعذر حماية كلمة المرور")?.to_string();
        let perms = input.permissions.unwrap_or_else(|| vec!["pos".into(), "invoices".into()]);
        let perms_json = serde_json::to_string(&perms).unwrap_or_else(|_| "[]".into());

        let uid = sqlx::query("INSERT INTO users(username, password_hash, full_name, role, permissions) VALUES (?, ?, ?, 'SELLER', ?)")
            .bind(username).bind(hash).bind(name).bind(perms_json).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
        Some(uid)
    } else {
        None
    };

    let employee_id = sqlx::query(
        "INSERT INTO employees(user_id, name, phone, job_title, address, work_hours, hire_date,
          base_salary_piasters, shift_start, shift_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(user_id).bind(name).bind(input.phone.as_deref().map(str::trim))
    .bind(job_title).bind(input.address.as_deref().map(str::trim)).bind(work_hours)
    .bind(&hire_date).bind(base_salary_piasters)
    .bind(&shift_start).bind(&shift_end)
    .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_CREATE', 'employees', ?)")
        .bind(admin.user_id).bind(employee_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(employee_id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmployeeInput {
    pub employee_id: i64,
    pub name: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub remove_account: Option<bool>,
    pub phone: Option<String>,
    pub job_title: String,
    pub address: Option<String>,
    pub work_hours: i64,
    pub hire_date: String,
    pub base_salary_piasters: i64,
    pub shift_start: String,
    pub shift_end: String,
}

#[tauri::command]
pub async fn update_employee(
    state: tauri::State<'_, AppState>, token: String, input: UpdateEmployeeInput,
) -> Result<(), String> {
    let admin = state.user(&token, true)?;
    let name = clean_name(&input.name)?;
    let raw_job = input.job_title.trim();
    let job_title = if raw_job.is_empty() {
        "بائع"
    } else {
        clean_name(raw_job)?
    };
    let work_hours = if input.work_hours < 1 || input.work_hours > 24 { 8 } else { input.work_hours };
    let base_salary_piasters = if input.base_salary_piasters < 0 { 0 } else { input.base_salary_piasters };
    let hire_date = if input.hire_date.trim().len() != 10 {
        chrono::Local::now().format("%Y-%m-%d").to_string()
    } else {
        input.hire_date.trim().to_string()
    };
    let shift_start = if input.shift_start.trim().len() != 5 { "09:00".to_string() } else { input.shift_start.trim().to_string() };
    let shift_end = if input.shift_end.trim().len() != 5 { "17:00".to_string() } else { input.shift_end.trim().to_string() };

    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let row = sqlx::query("SELECT user_id FROM employees WHERE id = ? AND is_active = 1")
        .bind(input.employee_id).fetch_optional(&mut *tx).await.map_err(db_error)?
        .ok_or("الموظف غير موجود")?;
    let existing_user_id: Option<i64> = row.get("user_id");

    sqlx::query(
        "UPDATE employees SET name = ?, phone = ?, job_title = ?, address = ?, work_hours = ?,
         hire_date = ?, base_salary_piasters = ?, shift_start = ?, shift_end = ? WHERE id = ?"
    )
    .bind(name).bind(input.phone.as_deref().map(str::trim)).bind(job_title)
    .bind(input.address.as_deref().map(str::trim)).bind(work_hours)
    .bind(&hire_date).bind(base_salary_piasters)
    .bind(&shift_start).bind(&shift_end).bind(input.employee_id)
    .execute(&mut *tx).await.map_err(db_error)?;

    let should_remove = input.remove_account.unwrap_or(false);
    let trimmed_username = input.username.as_deref().map(str::trim).filter(|s| !s.is_empty());

    if let Some(user_id) = existing_user_id {
        if should_remove {
            if user_id == admin.user_id {
                return Err("لا يمكنك إلغاء حساب المدير الخاص بك".into());
            }
            sqlx::query("UPDATE users SET username = username || '_deleted_' || id, is_active = 0 WHERE id = ?")
                .bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
            sqlx::query("UPDATE employees SET user_id = NULL WHERE id = ?")
                .bind(input.employee_id).execute(&mut *tx).await.map_err(db_error)?;
        } else {
            if let Some(u) = trimmed_username {
                let uname = clean_name(u)?;
                sqlx::query("UPDATE users SET username = username || '_deleted_' || id WHERE username = ? AND is_active = 0 AND id != ?")
                    .bind(uname).bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
                sqlx::query("UPDATE users SET full_name = ?, username = ? WHERE id = ?")
                    .bind(name).bind(uname).bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
            } else {
                sqlx::query("UPDATE users SET full_name = ? WHERE id = ?")
                    .bind(name).bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
            }

            if let Some(perms) = input.permissions {
                let perms_json = serde_json::to_string(&perms).unwrap_or_else(|_| "[]".into());
                sqlx::query("UPDATE users SET permissions = ? WHERE id = ?")
                    .bind(perms_json).bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
            }

            if let Some(pwd) = input.password {
                let trimmed = pwd.trim();
                if !trimmed.is_empty() {
                    if trimmed.chars().count() < 10 {
                        return Err("كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل".into());
                    }
                    let salt = SaltString::generate(&mut OsRng);
                    let hash = Argon2::default().hash_password(trimmed.as_bytes(), &salt)
                        .map_err(|_| "تعذر حماية كلمة المرور")?.to_string();
                    sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                        .bind(hash).bind(user_id).execute(&mut *tx).await.map_err(db_error)?;
                }
            }
        }
    } else if !should_remove {
        if let Some(u) = trimmed_username {
            let uname = clean_name(u)?;
            sqlx::query("UPDATE users SET username = username || '_deleted_' || id WHERE username = ? AND is_active = 0")
                .bind(uname).execute(&mut *tx).await.map_err(db_error)?;
            let pwd = input.password.as_deref().unwrap_or("").trim();
            if pwd.chars().count() < 10 {
                return Err("كلمة المرور يجب أن تكون 10 أحرف على الأقل لإنشاء حساب الموظف".into());
            }
            let salt = SaltString::generate(&mut OsRng);
            let hash = Argon2::default().hash_password(pwd.as_bytes(), &salt)
                .map_err(|_| "تعذر حماية كلمة المرور")?.to_string();
            let perms = input.permissions.unwrap_or_else(|| vec!["pos".into(), "invoices".into()]);
            let perms_json = serde_json::to_string(&perms).unwrap_or_else(|_| "[]".into());

            let new_uid = sqlx::query("INSERT INTO users(username, password_hash, full_name, role, permissions) VALUES (?, ?, ?, 'SELLER', ?)")
                .bind(uname).bind(hash).bind(name).bind(perms_json).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();

            sqlx::query("UPDATE employees SET user_id = ? WHERE id = ?")
                .bind(new_uid).bind(input.employee_id).execute(&mut *tx).await.map_err(db_error)?;
        }
    }

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_UPDATE', 'employees', ?)")
        .bind(admin.user_id).bind(input.employee_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_employee(
    state: tauri::State<'_, AppState>, token: String, employee_id: i64,
) -> Result<(), String> {
    let admin = state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let row = sqlx::query("SELECT user_id FROM employees WHERE id = ? AND is_active = 1")
        .bind(employee_id).fetch_optional(&mut *tx).await.map_err(db_error)?
        .ok_or("الموظف غير موجود")?;
    let user_id: Option<i64> = row.get("user_id");

    if let Some(uid) = user_id {
        if uid == admin.user_id {
            return Err("لا يمكنك حذف الحساب الخاص بك".into());
        }
        sqlx::query("UPDATE users SET username = username || '_deleted_' || id, is_active = 0 WHERE id = ?")
            .bind(uid).execute(&mut *tx).await.map_err(db_error)?;
    }

    sqlx::query("UPDATE employees SET is_active = 0 WHERE id = ?")
        .bind(employee_id).execute(&mut *tx).await.map_err(db_error)?;

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_DELETE', 'employees', ?)")
        .bind(admin.user_id).bind(employee_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[cfg(test)]
mod update_product_input_tests {
    use super::UpdateProductInput;

    #[test]
    fn update_product_accepts_frontend_field_names() {
        let input: UpdateProductInput = serde_json::from_value(serde_json::json!({
            "productId": 7,
            "name": "حذاء",
            "buyPricePiasters": 50000,
            "sellPricePiasters": 70000,
            "lowStockThreshold": 0,
            "barcode": "123456",
            "variants": [{ "variantId": null, "color": "أسود", "size": "42", "quantity": 3 }]
        })).expect("frontend update payload should deserialize");
        assert_eq!(input.product_id, 7);
        assert_eq!(input.variants.unwrap()[0].variant_id, None);
    }
}

fn clean_customer_phone(value: &str) -> Result<String, String> {
    let phone: String = value.chars().filter(|c| !c.is_whitespace() && *c != '-').collect();
    let digits = phone.strip_prefix('+').unwrap_or(&phone);
    if !(7..=15).contains(&digits.len()) || !digits.chars().all(|c| c.is_ascii_digit()) {
        return Err("رقم هاتف العميل يجب أن يتكون من 7 إلى 15 رقمًا".into());
    }
    Ok(phone)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerChoice {
    id: i64,
    name: String,
    phone: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerView {
    id: i64,
    name: String,
    phone: Option<String>,
    created_at: String,
    invoice_count: i64,
    total_piasters: i64,
    outstanding_piasters: i64,
    last_invoice_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerInvoiceView {
    invoice_number: i64,
    created_at: String,
    seller_name: String,
    total_piasters: i64,
    paid_piasters: i64,
    remaining_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerProductView {
    product_id: i64,
    name: String,
    quantity: i64,
    total_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerPaymentView {
    invoice_number: i64,
    amount_piasters: i64,
    method: String,
    created_at: String,
    employee_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerDetailView {
    customer: CustomerView,
    invoices: Vec<CustomerInvoiceView>,
    favorite_products: Vec<CustomerProductView>,
    payments: Vec<CustomerPaymentView>,
}

fn customer_from_row(row: &sqlx::sqlite::SqliteRow) -> CustomerView {
    CustomerView {
        id: row.get("id"), name: row.get("name"), phone: row.get("phone"),
        created_at: row.get("created_at"), invoice_count: row.get("invoice_count"),
        total_piasters: row.get("total_piasters"), outstanding_piasters: row.get("outstanding_piasters"),
        last_invoice_at: row.get("last_invoice_at"),
    }
}

#[tauri::command]
pub async fn list_customer_choices(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<CustomerChoice>, String> {
    state.user(&token, false)?;
    let rows = sqlx::query("SELECT id, name, phone FROM customers WHERE phone IS NOT NULL ORDER BY name COLLATE NOCASE")
        .fetch_all(&state.pool).await.map_err(db_error)?;
    Ok(rows.iter().map(|row| CustomerChoice {
        id: row.get("id"), name: row.get("name"), phone: row.get("phone"),
    }).collect())
}

#[tauri::command]
pub async fn create_customer(
    state: tauri::State<'_, AppState>, token: String, name: String, phone: String,
) -> Result<i64, String> {
    let user = state.user(&token, true)?;
    let name = clean_name(&name)?;
    let phone = clean_customer_phone(&phone)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let id = sqlx::query("INSERT INTO customers(name, phone) VALUES (?, ?)")
        .bind(name).bind(phone).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'CUSTOMER_CREATE', 'customers', ?)")
        .bind(user.user_id).bind(id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(id)
}

#[tauri::command]
pub async fn list_customers(state: tauri::State<'_, AppState>, token: String) -> Result<Vec<CustomerView>, String> {
    state.user(&token, true)?;
    let rows = sqlx::query(
        "SELECT c.id, c.name, c.phone, c.created_at,
                COUNT(i.id) AS invoice_count,
                COALESCE(SUM(i.total_piasters), 0) AS total_piasters,
                COALESCE(SUM(i.remaining_piasters), 0) AS outstanding_piasters,
                MAX(i.created_at) AS last_invoice_at
         FROM customers c
         LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'COMPLETED'
         GROUP BY c.id ORDER BY c.id DESC",
    ).fetch_all(&state.pool).await.map_err(db_error)?;
    Ok(rows.iter().map(customer_from_row).collect())
}

#[tauri::command]
pub async fn get_customer_details(
    state: tauri::State<'_, AppState>, token: String, customer_id: i64,
) -> Result<CustomerDetailView, String> {
    state.user(&token, true)?;
    let customer_row = sqlx::query(
        "SELECT c.id, c.name, c.phone, c.created_at,
                COUNT(i.id) AS invoice_count,
                COALESCE(SUM(i.total_piasters), 0) AS total_piasters,
                COALESCE(SUM(i.remaining_piasters), 0) AS outstanding_piasters,
                MAX(i.created_at) AS last_invoice_at
         FROM customers c
         LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'COMPLETED'
         WHERE c.id = ? GROUP BY c.id",
    ).bind(customer_id).fetch_optional(&state.pool).await.map_err(db_error)?
        .ok_or("العميل غير موجود")?;
    let customer = customer_from_row(&customer_row);

    let invoice_rows = sqlx::query(
        "SELECT i.invoice_number, i.created_at, COALESCE(emp.name, u.full_name) AS seller_name,
                i.total_piasters,
                i.total_piasters - i.remaining_piasters AS paid_piasters,
                i.remaining_piasters
         FROM invoices i
         LEFT JOIN employees emp ON emp.id = i.employee_id
         JOIN users u ON u.id = i.seller_id
         WHERE i.customer_id = ? AND i.status = 'COMPLETED'
         ORDER BY i.id DESC",
    ).bind(customer_id).fetch_all(&state.pool).await.map_err(db_error)?;
    let invoices = invoice_rows.iter().map(|row| CustomerInvoiceView {
        invoice_number: row.get("invoice_number"), created_at: row.get("created_at"),
        seller_name: row.get("seller_name"), total_piasters: row.get("total_piasters"),
        paid_piasters: row.get("paid_piasters"), remaining_piasters: row.get("remaining_piasters"),
    }).collect();

    let product_rows = sqlx::query(
        "SELECT ii.product_id, p.name, SUM(ii.quantity) AS quantity,
                SUM(ii.line_total_piasters) AS total_piasters
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id AND i.status = 'COMPLETED'
         JOIN products p ON p.id = ii.product_id
         WHERE i.customer_id = ?
         GROUP BY ii.product_id ORDER BY quantity DESC, total_piasters DESC LIMIT 10",
    ).bind(customer_id).fetch_all(&state.pool).await.map_err(db_error)?;
    let favorite_products = product_rows.iter().map(|row| CustomerProductView {
        product_id: row.get("product_id"), name: row.get("name"),
        quantity: row.get("quantity"), total_piasters: row.get("total_piasters"),
    }).collect();

    let payment_rows = sqlx::query(
        "SELECT i.invoice_number, cp.amount_piasters, cp.method, cp.created_at,
                u.full_name AS employee_name
         FROM customer_payments cp
         JOIN invoices i ON i.id = cp.invoice_id
         JOIN users u ON u.id = cp.performed_by
         WHERE cp.customer_id = ? ORDER BY cp.id DESC",
    ).bind(customer_id).fetch_all(&state.pool).await.map_err(db_error)?;
    let payments = payment_rows.iter().map(|row| CustomerPaymentView {
        invoice_number: row.get("invoice_number"), amount_piasters: row.get("amount_piasters"),
        method: row.get("method"), created_at: row.get("created_at"),
        employee_name: row.get("employee_name"),
    }).collect();
    Ok(CustomerDetailView { customer, invoices, favorite_products, payments })
}

#[tauri::command]
pub async fn collect_customer_payment(
    state: tauri::State<'_, AppState>, token: String, customer_id: i64,
    invoice_number: i64, amount_piasters: i64, method: String,
) -> Result<(), String> {
    let user = state.user(&token, true)?;
    if amount_piasters <= 0 { return Err("المبلغ المدفوع يجب أن يكون أكبر من صفر".into()); }
    let (cash, instapay, wallet) = match method.as_str() {
        "CASH" => (amount_piasters, 0, 0),
        "INSTAPAY" => (0, amount_piasters, 0),
        "WALLET" => (0, 0, amount_piasters),
        _ => return Err("طريقة الدفع غير صحيحة".into()),
    };
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let row = sqlx::query(
        "SELECT id, remaining_piasters FROM invoices
         WHERE invoice_number = ? AND customer_id = ? AND status = 'COMPLETED'",
    ).bind(invoice_number).bind(customer_id).fetch_optional(&mut *tx).await.map_err(db_error)?
        .ok_or("الفاتورة غير موجودة لهذا العميل")?;
    let invoice_id: i64 = row.get("id");
    let remaining: i64 = row.get("remaining_piasters");
    if amount_piasters > remaining { return Err("المبلغ أكبر من المتبقي على الفاتورة".into()); }
    let updated = sqlx::query(
        "UPDATE invoices SET remaining_piasters = remaining_piasters - ?,
                paid_cash_piasters = paid_cash_piasters + ?,
                paid_instapay_piasters = paid_instapay_piasters + ?,
                paid_wallet_piasters = paid_wallet_piasters + ?
         WHERE id = ? AND remaining_piasters >= ? AND status = 'COMPLETED'",
    ).bind(amount_piasters).bind(cash).bind(instapay).bind(wallet)
        .bind(invoice_id).bind(amount_piasters).execute(&mut *tx).await.map_err(db_error)?;
    if updated.rows_affected() != 1 { return Err("تغير الرصيد؛ أعد تحميل بيانات العميل".into()); }
    let payment_id = sqlx::query(
        "INSERT INTO customer_payments(customer_id, invoice_id, amount_piasters, method, performed_by)
         VALUES (?, ?, ?, ?, ?)",
    ).bind(customer_id).bind(invoice_id).bind(amount_piasters).bind(method)
        .bind(user.user_id).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'CUSTOMER_PAYMENT', 'customer_payments', ?)")
        .bind(user.user_id).bind(payment_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplierAccountView {
    pub id: i64,
    pub name: String,
    pub total_goods_piasters: i64,
    pub total_paid_piasters: i64,
    pub outstanding_piasters: i64,
    pub last_transaction_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplierTransactionView {
    pub id: i64,
    pub supplier_id: i64,
    pub employee_name: String,
    pub transaction_type: String,
    pub goods_amount_piasters: i64,
    pub paid_amount_piasters: i64,
    pub payment_method: String,
    pub previous_balance_piasters: i64,
    pub new_balance_piasters: i64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplierStatementView {
    pub supplier: SupplierAccountView,
    pub transactions: Vec<SupplierTransactionView>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSupplierTransactionInput {
    pub supplier_id: i64,
    pub employee_id: Option<i64>,
    pub goods_amount_piasters: i64,
    pub paid_amount_piasters: i64,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn list_suppliers_with_balances(
    state: tauri::State<'_, AppState>, token: String,
) -> Result<Vec<SupplierAccountView>, String> {
    let _user = state.user(&token, false)?;
    let rows = sqlx::query(
        "SELECT s.id, s.name,
                COALESCE(SUM(st.goods_amount_piasters), 0) AS total_goods_piasters,
                COALESCE(SUM(st.paid_amount_piasters), 0) AS total_paid_piasters,
                COALESCE((SELECT new_balance_piasters FROM supplier_transactions WHERE supplier_id = s.id ORDER BY id DESC LIMIT 1), 0) AS outstanding_piasters,
                (SELECT created_at FROM supplier_transactions WHERE supplier_id = s.id ORDER BY id DESC LIMIT 1) AS last_transaction_at
         FROM suppliers s
         LEFT JOIN supplier_transactions st ON st.supplier_id = s.id
         GROUP BY s.id, s.name
         ORDER BY s.name"
    ).fetch_all(&state.pool).await.map_err(db_error)?;

    let result = rows.iter().map(|row| SupplierAccountView {
        id: row.get("id"),
        name: row.get("name"),
        total_goods_piasters: row.get("total_goods_piasters"),
        total_paid_piasters: row.get("total_paid_piasters"),
        outstanding_piasters: row.get("outstanding_piasters"),
        last_transaction_at: row.get("last_transaction_at"),
    }).collect();

    Ok(result)
}

#[tauri::command]
pub async fn create_supplier_transaction(
    state: tauri::State<'_, AppState>, token: String, input: CreateSupplierTransactionInput,
) -> Result<i64, String> {
    let user = state.user(&token, true)?;
    if input.goods_amount_piasters < 0 || input.paid_amount_piasters < 0 {
        return Err("المبالغ يجب أن تكون أكبر من أو تساوي صفر".into());
    }
    if input.goods_amount_piasters == 0 && input.paid_amount_piasters == 0 {
        return Err("يجب إدخال قيمة بضاعة أو مبلغ مدفوع".into());
    }
    if !["CREDIT", "CASH", "INSTAPAY", "WALLET"].contains(&input.payment_method.as_str()) {
        return Err("طريقة الدفع غير صحيحة".into());
    }

    let mut tx = state.pool.begin().await.map_err(db_error)?;

    let current_balance: i64 = sqlx::query_scalar(
        "SELECT new_balance_piasters FROM supplier_transactions WHERE supplier_id = ? ORDER BY id DESC LIMIT 1"
    ).bind(input.supplier_id).fetch_optional(&mut *tx).await.map_err(db_error)?.unwrap_or(0);

    let new_balance = current_balance + input.goods_amount_piasters - input.paid_amount_piasters;
    if new_balance < 0 {
        return Err("المبلغ المدفوع يتجاوز إجمالي الرصيد المستحق للمورد".into());
    }

    let transaction_type = if input.goods_amount_piasters > 0 { "RECEIPT" } else { "PAYMENT" };
    let employee_id = input.employee_id.unwrap_or(user.user_id);

    let trans_id = sqlx::query(
        "INSERT INTO supplier_transactions(
            supplier_id, employee_id, transaction_type, goods_amount_piasters,
            paid_amount_piasters, payment_method, previous_balance_piasters,
            new_balance_piasters, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(input.supplier_id)
     .bind(employee_id)
     .bind(transaction_type)
     .bind(input.goods_amount_piasters)
     .bind(input.paid_amount_piasters)
     .bind(input.payment_method)
     .bind(current_balance)
     .bind(new_balance)
     .bind(input.notes)
     .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'SUPPLIER_TRANSACTION', 'supplier_transactions', ?)")
        .bind(user.user_id).bind(trans_id).execute(&mut *tx).await.map_err(db_error)?;

    tx.commit().await.map_err(db_error)?;
    Ok(trans_id)
}

#[tauri::command]
pub async fn get_supplier_statement(
    state: tauri::State<'_, AppState>, token: String, supplier_id: i64,
) -> Result<SupplierStatementView, String> {
    let _user = state.user(&token, false)?;
    let supplier_row = sqlx::query(
        "SELECT s.id, s.name,
                COALESCE(SUM(st.goods_amount_piasters), 0) AS total_goods_piasters,
                COALESCE(SUM(st.paid_amount_piasters), 0) AS total_paid_piasters,
                COALESCE((SELECT new_balance_piasters FROM supplier_transactions WHERE supplier_id = s.id ORDER BY id DESC LIMIT 1), 0) AS outstanding_piasters,
                (SELECT created_at FROM supplier_transactions WHERE supplier_id = s.id ORDER BY id DESC LIMIT 1) AS last_transaction_at
         FROM suppliers s
         LEFT JOIN supplier_transactions st ON st.supplier_id = s.id
         WHERE s.id = ?
         GROUP BY s.id, s.name"
    ).bind(supplier_id).fetch_optional(&state.pool).await.map_err(db_error)?
        .ok_or("المورد غير موجود")?;

    let supplier = SupplierAccountView {
        id: supplier_row.get("id"),
        name: supplier_row.get("name"),
        total_goods_piasters: supplier_row.get("total_goods_piasters"),
        total_paid_piasters: supplier_row.get("total_paid_piasters"),
        outstanding_piasters: supplier_row.get("outstanding_piasters"),
        last_transaction_at: supplier_row.get("last_transaction_at"),
    };

    let trans_rows = sqlx::query(
        "SELECT st.id, st.supplier_id, st.transaction_type, st.goods_amount_piasters,
                st.paid_amount_piasters, st.payment_method, st.previous_balance_piasters,
                st.new_balance_piasters, st.notes, st.created_at, u.full_name AS employee_name
         FROM supplier_transactions st
         JOIN users u ON u.id = st.employee_id
         WHERE st.supplier_id = ?
         ORDER BY st.id DESC"
    ).bind(supplier_id).fetch_all(&state.pool).await.map_err(db_error)?;

    let transactions = trans_rows.iter().map(|row| SupplierTransactionView {
        id: row.get("id"),
        supplier_id: row.get("supplier_id"),
        employee_name: row.get("employee_name"),
        transaction_type: row.get("transaction_type"),
        goods_amount_piasters: row.get("goods_amount_piasters"),
        paid_amount_piasters: row.get("paid_amount_piasters"),
        payment_method: row.get("payment_method"),
        previous_balance_piasters: row.get("previous_balance_piasters"),
        new_balance_piasters: row.get("new_balance_piasters"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
    }).collect();

    Ok(SupplierStatementView { supplier, transactions })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundItemInput {
    pub invoice_item_id: i64,
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub warehouse_id: i64,
    pub name_snapshot: String,
    pub unit_price_piasters: i64,
    pub quantity: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRefundInput {
    pub invoice_id: i64,
    pub refund_method: String,
    pub notes: Option<String>,
    pub items: Vec<RefundItemInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundResult {
    pub refund_number: i64,
    pub total_refund_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundItemView {
    pub id: i64,
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub warehouse_id: i64,
    pub name_snapshot: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub unit_price_piasters: i64,
    pub quantity: i64,
    pub line_total_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundView {
    pub id: i64,
    pub refund_number: i64,
    pub invoice_id: i64,
    pub invoice_number: i64,
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub seller_id: i64,
    pub seller_name: String,
    pub performed_by_name: String,
    pub total_refund_piasters: i64,
    pub refund_method: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundDetailView {
    pub refund: RefundView,
    pub items: Vec<RefundItemView>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReturnedItemQty {
    pub invoice_item_id: i64,
    pub returned_quantity: i64,
}

#[tauri::command]
pub async fn get_invoice_refund_summary(
    state: tauri::State<'_, AppState>,
    token: String,
    invoice_id: i64,
) -> Result<Vec<ReturnedItemQty>, String> {
    state.user(&token, true)?;
    let rows = sqlx::query(
        "SELECT invoice_item_id, COALESCE(SUM(quantity), 0) AS returned_qty
         FROM refund_items ri
         JOIN refunds r ON r.id = ri.refund_id
         WHERE r.invoice_id = ?
         GROUP BY invoice_item_id",
    )
    .bind(invoice_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    Ok(rows
        .iter()
        .map(|r| ReturnedItemQty {
            invoice_item_id: r.get("invoice_item_id"),
            returned_quantity: r.get("returned_qty"),
        })
        .collect())
}

#[tauri::command]
pub async fn process_refund(
    state: tauri::State<'_, AppState>,
    token: String,
    input: ProcessRefundInput,
) -> Result<RefundResult, String> {
    let user = state.user(&token, false)?;
    if input.items.is_empty() {
        return Err("اختر منتجًا واحدًا على الأقل لإجراء المرتجع".into());
    }

    let mut tx = state.pool.begin().await.map_err(db_error)?;

    let invoice_row = sqlx::query(
        "SELECT id, invoice_number, customer_id, seller_id, employee_id, total_piasters, remaining_piasters, status
         FROM invoices WHERE id = ?",
    )
    .bind(input.invoice_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(db_error)?
    .ok_or("الفاتورة غير موجودة")?;

    let inv_id: i64 = invoice_row.get("id");
    let inv_number: i64 = invoice_row.get("invoice_number");
    let customer_id: Option<i64> = invoice_row.get("customer_id");
    let seller_id: i64 = invoice_row.get("seller_id");
    let employee_id: Option<i64> = invoice_row.get("employee_id");
    let inv_status: String = invoice_row.get("status");
    let inv_remaining: i64 = invoice_row.get("remaining_piasters");

    if inv_status == "CANCELLED" {
        return Err("هذه الفاتورة ملغاة/مرتجعة بالكامل بالفعل".into());
    }

    let mut total_refund_piasters: i64 = 0;
    for item in &input.items {
        if item.quantity <= 0 {
            return Err("كمية المرتجع يجب أن تكون أكبر من 0".into());
        }
        let item_row = sqlx::query(
            "SELECT quantity, sell_price_piasters, discount_each_piasters FROM invoice_items WHERE id = ? AND invoice_id = ?",
        )
        .bind(item.invoice_item_id)
        .bind(inv_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or("صنف الفاتورة غير موجود")?;

        let orig_qty: i64 = item_row.get("quantity");
        
        let returned_qty: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(quantity), 0) FROM refund_items WHERE invoice_item_id = ?",
        )
        .bind(item.invoice_item_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(db_error)?;

        if item.quantity > (orig_qty - returned_qty) {
            return Err("الكمية المراد إرجاعها أكبر من الكمية المتبقية في الفاتورة".into());
        }

        total_refund_piasters += item.unit_price_piasters * item.quantity;
    }

    let refund_num = sqlx::query("INSERT INTO refund_sequence DEFAULT VALUES")
        .execute(&mut *tx)
        .await
        .map_err(db_error)?
        .last_insert_rowid();

    let refund_id = sqlx::query(
        "INSERT INTO refunds(refund_number, invoice_id, invoice_number, customer_id, seller_id, employee_id, performed_by, total_refund_piasters, refund_method, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(refund_num)
    .bind(inv_id)
    .bind(inv_number)
    .bind(customer_id)
    .bind(seller_id)
    .bind(employee_id)
    .bind(user.user_id)
    .bind(total_refund_piasters)
    .bind(&input.refund_method)
    .bind(input.notes.as_deref().map(str::trim))
    .execute(&mut *tx)
    .await
    .map_err(db_error)?
    .last_insert_rowid();

    for item in &input.items {
        let line_total = item.unit_price_piasters * item.quantity;
        sqlx::query(
            "INSERT INTO refund_items(refund_id, invoice_item_id, product_id, variant_id, warehouse_id, name_snapshot, unit_price_piasters, quantity, line_total_piasters)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(refund_id)
        .bind(item.invoice_item_id)
        .bind(item.product_id)
        .bind(item.variant_id)
        .bind(item.warehouse_id)
        .bind(&item.name_snapshot)
        .bind(item.unit_price_piasters)
        .bind(item.quantity)
        .bind(line_total)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;

        let balance_id: Option<i64> = match item.variant_id {
            Some(vid) => sqlx::query_scalar(
                "SELECT id FROM inventory_balances WHERE product_id = ? AND variant_id = ? AND warehouse_id = ?",
            )
            .bind(item.product_id)
            .bind(vid)
            .bind(item.warehouse_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(db_error)?,
            None => sqlx::query_scalar(
                "SELECT id FROM inventory_balances WHERE product_id = ? AND variant_id IS NULL AND warehouse_id = ?",
            )
            .bind(item.product_id)
            .bind(item.warehouse_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(db_error)?,
        };

        if let Some(bid) = balance_id {
            let qty_before: i64 = sqlx::query_scalar("SELECT quantity FROM inventory_balances WHERE id = ?")
                .bind(bid)
                .fetch_one(&mut *tx)
                .await
                .map_err(db_error)?;

            sqlx::query("UPDATE inventory_balances SET quantity = quantity + ? WHERE id = ?")
                .bind(item.quantity)
                .bind(bid)
                .execute(&mut *tx)
                .await
                .map_err(db_error)?;

            sqlx::query(
                "INSERT INTO inventory_movements(product_id, variant_id, warehouse_id, change_quantity, quantity_before, quantity_after, movement_type, reference_id, performed_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'REFUND', ?, ?)",
            )
            .bind(item.product_id)
            .bind(item.variant_id)
            .bind(item.warehouse_id)
            .bind(item.quantity)
            .bind(qty_before)
            .bind(qty_before + item.quantity)
            .bind(refund_id)
            .bind(user.user_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
        }
    }

    if let Some(cid) = customer_id {
        if input.refund_method == "DEBT_DEDUCTION" {
            let new_rem = (inv_remaining - total_refund_piasters).max(0);
            sqlx::query("UPDATE invoices SET remaining_piasters = ? WHERE id = ?")
                .bind(new_rem)
                .bind(inv_id)
                .execute(&mut *tx)
                .await
                .map_err(db_error)?;
        }
        let _ = cid;
    }

    let total_inv_qty: i64 = sqlx::query_scalar("SELECT SUM(quantity) FROM invoice_items WHERE invoice_id = ?")
        .bind(inv_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(db_error)?;

    let total_refunded_qty: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(ri.quantity), 0) FROM refund_items ri JOIN refunds r ON r.id = ri.refund_id WHERE r.invoice_id = ?",
    )
    .bind(inv_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(db_error)?;

    if total_refunded_qty >= total_inv_qty {
        sqlx::query("UPDATE invoices SET status = 'CANCELLED' WHERE id = ?")
            .bind(inv_id)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?;
    }

    tx.commit().await.map_err(db_error)?;
    Ok(RefundResult {
        refund_number: refund_num,
        total_refund_piasters,
    })
}

#[tauri::command]
pub async fn list_refunds(
    state: tauri::State<'_, AppState>,
    token: String,
) -> Result<Vec<RefundView>, String> {
    state.user_with_permission(&token, "returns")?;
    let rows = sqlx::query(
        "SELECT r.id, r.refund_number, r.invoice_id, r.invoice_number, r.customer_id,
                c.name AS customer_name, r.seller_id, COALESCE(emp.name, u_seller.full_name) AS seller_name,
                u_perf.full_name AS performed_by_name, r.total_refund_piasters,
                r.refund_method, r.notes, r.created_at
         FROM refunds r
         LEFT JOIN customers c ON c.id = r.customer_id
         LEFT JOIN employees emp ON emp.id = r.employee_id
         JOIN users u_seller ON u_seller.id = r.seller_id
         JOIN users u_perf ON u_perf.id = r.performed_by
         ORDER BY r.id DESC",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    Ok(rows
        .iter()
        .map(|row| RefundView {
            id: row.get("id"),
            refund_number: row.get("refund_number"),
            invoice_id: row.get("invoice_id"),
            invoice_number: row.get("invoice_number"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            seller_id: row.get("seller_id"),
            seller_name: row.get("seller_name"),
            performed_by_name: row.get("performed_by_name"),
            total_refund_piasters: row.get("total_refund_piasters"),
            refund_method: row.get("refund_method"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_refund_details(
    state: tauri::State<'_, AppState>,
    token: String,
    refund_id: i64,
) -> Result<RefundDetailView, String> {
    state.user_with_permission(&token, "returns")?;
    let r_row = sqlx::query(
        "SELECT r.id, r.refund_number, r.invoice_id, r.invoice_number, r.customer_id,
                c.name AS customer_name, r.seller_id, COALESCE(emp.name, u_seller.full_name) AS seller_name,
                u_perf.full_name AS performed_by_name, r.total_refund_piasters,
                r.refund_method, r.notes, r.created_at
         FROM refunds r
         LEFT JOIN customers c ON c.id = r.customer_id
         LEFT JOIN employees emp ON emp.id = r.employee_id
         JOIN users u_seller ON u_seller.id = r.seller_id
         JOIN users u_perf ON u_perf.id = r.performed_by
         WHERE r.id = ?",
    )
    .bind(refund_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("المرتجع غير موجود")?;

    let refund = RefundView {
        id: r_row.get("id"),
        refund_number: r_row.get("refund_number"),
        invoice_id: r_row.get("invoice_id"),
        invoice_number: r_row.get("invoice_number"),
        customer_id: r_row.get("customer_id"),
        customer_name: r_row.get("customer_name"),
        seller_id: r_row.get("seller_id"),
        seller_name: r_row.get("seller_name"),
        performed_by_name: r_row.get("performed_by_name"),
        total_refund_piasters: r_row.get("total_refund_piasters"),
        refund_method: r_row.get("refund_method"),
        notes: r_row.get("notes"),
        created_at: r_row.get("created_at"),
    };

    let item_rows = sqlx::query(
        "SELECT ri.id, ri.product_id, ri.variant_id, ri.warehouse_id, ri.name_snapshot,
                v.color, v.size, ri.unit_price_piasters, ri.quantity, ri.line_total_piasters
         FROM refund_items ri
         LEFT JOIN product_variants v ON v.id = ri.variant_id
         WHERE ri.refund_id = ?",
    )
    .bind(refund_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let items = item_rows
        .iter()
        .map(|row| RefundItemView {
            id: row.get("id"),
            product_id: row.get("product_id"),
            variant_id: row.get("variant_id"),
            warehouse_id: row.get("warehouse_id"),
            name_snapshot: row.get("name_snapshot"),
            color: row.get("color"),
            size: row.get("size"),
            unit_price_piasters: row.get("unit_price_piasters"),
            quantity: row.get("quantity"),
            line_total_piasters: row.get("line_total_piasters"),
        })
        .collect();

    Ok(RefundDetailView { refund, items })
}

#[tauri::command]
pub async fn delete_refund(
    state: tauri::State<'_, AppState>,
    token: String,
    refund_id: i64,
) -> Result<(), String> {
    state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;

    let refund_row = sqlx::query("SELECT invoice_id, total_refund_piasters FROM refunds WHERE id = ?")
        .bind(refund_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or("المرتجع غير موجود")?;

    let inv_id: i64 = refund_row.get("invoice_id");

    let items = sqlx::query("SELECT product_id, variant_id, warehouse_id, quantity FROM refund_items WHERE refund_id = ?")
        .bind(refund_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(db_error)?;

    for item in items {
        let pid: i64 = item.get("product_id");
        let vid: Option<i64> = item.get("variant_id");
        let wid: i64 = item.get("warehouse_id");
        let qty: i64 = item.get("quantity");

        let balance_id: Option<i64> = match vid {
            Some(v) => sqlx::query_scalar("SELECT id FROM inventory_balances WHERE product_id = ? AND variant_id = ? AND warehouse_id = ?")
                .bind(pid).bind(v).bind(wid).fetch_optional(&mut *tx).await.map_err(db_error)?,
            None => sqlx::query_scalar("SELECT id FROM inventory_balances WHERE product_id = ? AND variant_id IS NULL AND warehouse_id = ?")
                .bind(pid).bind(wid).fetch_optional(&mut *tx).await.map_err(db_error)?,
        };

        if let Some(bid) = balance_id {
            sqlx::query("UPDATE inventory_balances SET quantity = CASE WHEN quantity >= ? THEN quantity - ? ELSE 0 END WHERE id = ?")
                .bind(qty).bind(qty).bind(bid).execute(&mut *tx).await.map_err(db_error)?;
        }
    }

    sqlx::query("DELETE FROM refunds WHERE id = ?").bind(refund_id).execute(&mut *tx).await.map_err(db_error)?;

    sqlx::query("UPDATE invoices SET status = 'COMPLETED' WHERE id = ? AND status = 'CANCELLED'")
        .bind(inv_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;

    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMovementReportInput {
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSaleRecord {
    pub invoice_id: i64,
    pub invoice_number: i64,
    pub created_at: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub seller_id: i64,
    pub seller_name: String,
    pub product_name: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub warehouse_name: String,
    pub quantity: i64,
    pub unit_price_piasters: i64,
    pub discount_piasters: i64,
    pub line_total_piasters: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductReturnRecord {
    pub refund_id: i64,
    pub refund_number: i64,
    pub invoice_id: i64,
    pub invoice_number: i64,
    pub created_at: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub seller_id: i64,
    pub seller_name: String,
    pub performed_by_name: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub warehouse_name: String,
    pub quantity: i64,
    pub unit_price_piasters: i64,
    pub line_total_piasters: i64,
    pub refund_method: String,
    pub notes: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductStockMovementRecord {
    pub id: i64,
    pub created_at: String,
    pub movement_type: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub warehouse_name: String,
    pub change_quantity: i64,
    pub quantity_before: i64,
    pub quantity_after: i64,
    pub reference_id: Option<i64>,
    pub performed_by_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMovementSummary {
    pub product_id: i64,
    pub product_name: String,
    pub barcode: String,
    pub category_name: String,
    pub total_sold_quantity: i64,
    pub gross_sales_piasters: i64,
    pub net_sales_piasters: i64,
    pub total_refunded_quantity: i64,
    pub total_refunded_piasters: i64,
    pub current_stock: i64,
    pub total_invoices_count: i64,
    pub distinct_customers_count: i64,
    pub distinct_sellers_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMovementReportView {
    pub summary: ProductMovementSummary,
    pub sales: Vec<ProductSaleRecord>,
    pub returns: Vec<ProductReturnRecord>,
    pub stock_movements: Vec<ProductStockMovementRecord>,
}

#[tauri::command]
pub async fn get_product_movement_report(
    state: tauri::State<'_, AppState>,
    token: String,
    input: ProductMovementReportInput,
) -> Result<ProductMovementReportView, String> {
    state.user(&token, false)?;

    // 1. Fetch Product Header
    let p_row = sqlx::query(
        "SELECT p.id, p.name, p.barcode, cat.name as category_name
         FROM products p
         JOIN categories cat ON cat.id = p.category_id
         WHERE p.id = ?",
    )
    .bind(input.product_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("المنتج غير موجود")?;

    let product_name: String = p_row.get("name");
    let barcode: String = p_row.get("barcode");
    let category_name: String = p_row.get("category_name");

    // 2. Fetch Current Stock
    let current_stock: i64 = match input.variant_id {
        Some(vid) => {
            sqlx::query_scalar("SELECT COALESCE(SUM(quantity), 0) FROM inventory_balances WHERE product_id = ? AND variant_id = ?")
                .bind(input.product_id)
                .bind(vid)
                .fetch_one(&state.pool)
                .await
                .map_err(db_error)?
        }
        None => {
            sqlx::query_scalar("SELECT COALESCE(SUM(quantity), 0) FROM inventory_balances WHERE product_id = ?")
                .bind(input.product_id)
                .fetch_one(&state.pool)
                .await
                .map_err(db_error)?
        }
    };

    // 3. Fetch Sales Records
    let mut sales_query = String::from(
        "SELECT ii.invoice_id, i.invoice_number, i.created_at, COALESCE(i.customer_id, 0) as customer_id,
                COALESCE(c.name, 'عميل نقدي') as customer_name,
                i.seller_id, COALESCE(emp.name, u.full_name) as seller_name, ii.name_snapshot as product_name,
                v.color, v.size, w.name as warehouse_name, ii.quantity, ii.sell_price_piasters as unit_price_piasters,
                (ii.discount_each_piasters * ii.quantity) as discount_piasters, ii.line_total_piasters
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         LEFT JOIN customers c ON c.id = i.customer_id
         LEFT JOIN employees emp ON emp.id = i.employee_id
         JOIN users u ON u.id = i.seller_id
         JOIN warehouses w ON w.id = ii.warehouse_id
         LEFT JOIN product_variants v ON v.id = ii.variant_id
         WHERE ii.product_id = ?"
    );

    if input.variant_id.is_some() {
        sales_query.push_str(" AND ii.variant_id = ?");
    }
    if input.start_date.is_some() {
        sales_query.push_str(" AND i.created_at >= ?");
    }
    if input.end_date.is_some() {
        sales_query.push_str(" AND i.created_at <= ?");
    }
    sales_query.push_str(" ORDER BY i.created_at DESC");

    let mut q = sqlx::query(&sales_query).bind(input.product_id);
    if let Some(vid) = input.variant_id {
        q = q.bind(vid);
    }
    if let Some(ref sd) = input.start_date {
        q = q.bind(sd);
    }
    if let Some(ref ed) = input.end_date {
        q = q.bind(ed);
    }

    let sales_rows = q.fetch_all(&state.pool).await.map_err(db_error)?;
    let sales: Vec<ProductSaleRecord> = sales_rows
        .iter()
        .map(|row| ProductSaleRecord {
            invoice_id: row.get("invoice_id"),
            invoice_number: row.get("invoice_number"),
            created_at: row.get("created_at"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            seller_id: row.get("seller_id"),
            seller_name: row.get("seller_name"),
            product_name: row.get("product_name"),
            color: row.get("color"),
            size: row.get("size"),
            warehouse_name: row.get("warehouse_name"),
            quantity: row.get("quantity"),
            unit_price_piasters: row.get("unit_price_piasters"),
            discount_piasters: row.get("discount_piasters"),
            line_total_piasters: row.get("line_total_piasters"),
        })
        .collect();

    // 4. Fetch Return Records
    let mut returns_query = String::from(
        "SELECT ri.refund_id, r.refund_number, r.invoice_id, inv.invoice_number, r.created_at,
                COALESCE(r.customer_id, 0) as customer_id, COALESCE(c.name, 'عميل نقدي') as customer_name,
                r.seller_id, COALESCE(emp.name, seller_u.full_name) as seller_name,
                perf_u.full_name as performed_by_name, v.color, v.size, w.name as warehouse_name,
                ri.quantity, ri.unit_price_piasters, ri.line_total_piasters, r.refund_method, r.notes
         FROM refund_items ri
         JOIN refunds r ON r.id = ri.refund_id
         JOIN invoices inv ON inv.id = r.invoice_id
         LEFT JOIN customers c ON c.id = r.customer_id
         LEFT JOIN employees emp ON emp.id = r.employee_id
         JOIN users seller_u ON seller_u.id = r.seller_id
         JOIN users perf_u ON perf_u.id = r.performed_by
         JOIN warehouses w ON w.id = ri.warehouse_id
         LEFT JOIN product_variants v ON v.id = ri.variant_id
         WHERE ri.product_id = ?"
    );

    if input.variant_id.is_some() {
        returns_query.push_str(" AND ri.variant_id = ?");
    }
    if input.start_date.is_some() {
        returns_query.push_str(" AND r.created_at >= ?");
    }
    if input.end_date.is_some() {
        returns_query.push_str(" AND r.created_at <= ?");
    }
    returns_query.push_str(" ORDER BY r.created_at DESC");

    let mut rq = sqlx::query(&returns_query).bind(input.product_id);
    if let Some(vid) = input.variant_id {
        rq = rq.bind(vid);
    }
    if let Some(ref sd) = input.start_date {
        rq = rq.bind(sd);
    }
    if let Some(ref ed) = input.end_date {
        rq = rq.bind(ed);
    }

    let returns_rows = rq.fetch_all(&state.pool).await.map_err(db_error)?;
    let returns: Vec<ProductReturnRecord> = returns_rows
        .iter()
        .map(|row| ProductReturnRecord {
            refund_id: row.get("refund_id"),
            refund_number: row.get("refund_number"),
            invoice_id: row.get("invoice_id"),
            invoice_number: row.get("invoice_number"),
            created_at: row.get("created_at"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            seller_id: row.get("seller_id"),
            seller_name: row.get("seller_name"),
            performed_by_name: row.get("performed_by_name"),
            color: row.get("color"),
            size: row.get("size"),
            warehouse_name: row.get("warehouse_name"),
            quantity: row.get("quantity"),
            unit_price_piasters: row.get("unit_price_piasters"),
            line_total_piasters: row.get("line_total_piasters"),
            refund_method: row.get("refund_method"),
            notes: row.get("notes"),
        })
        .collect();

    // 5. Fetch Stock Movements
    let mut movements_query = String::from(
        "SELECT m.id, m.created_at, m.movement_type, v.color, v.size, w.name as warehouse_name,
                m.change_quantity, m.quantity_before, m.quantity_after, m.reference_id,
                u.full_name as performed_by_name
         FROM inventory_movements m
         JOIN warehouses w ON w.id = m.warehouse_id
         JOIN users u ON u.id = m.performed_by
         LEFT JOIN product_variants v ON v.id = m.variant_id
         WHERE m.product_id = ?"
    );

    if input.variant_id.is_some() {
        movements_query.push_str(" AND m.variant_id = ?");
    }
    if input.start_date.is_some() {
        movements_query.push_str(" AND m.created_at >= ?");
    }
    if input.end_date.is_some() {
        movements_query.push_str(" AND m.created_at <= ?");
    }
    movements_query.push_str(" ORDER BY m.created_at DESC");

    let mut mq = sqlx::query(&movements_query).bind(input.product_id);
    if let Some(vid) = input.variant_id {
        mq = mq.bind(vid);
    }
    if let Some(ref sd) = input.start_date {
        mq = mq.bind(sd);
    }
    if let Some(ref ed) = input.end_date {
        mq = mq.bind(ed);
    }

    let movements_rows = mq.fetch_all(&state.pool).await.map_err(db_error)?;
    let stock_movements: Vec<ProductStockMovementRecord> = movements_rows
        .iter()
        .map(|row| ProductStockMovementRecord {
            id: row.get("id"),
            created_at: row.get("created_at"),
            movement_type: row.get("movement_type"),
            color: row.get("color"),
            size: row.get("size"),
            warehouse_name: row.get("warehouse_name"),
            change_quantity: row.get("change_quantity"),
            quantity_before: row.get("quantity_before"),
            quantity_after: row.get("quantity_after"),
            reference_id: row.get("reference_id"),
            performed_by_name: row.get("performed_by_name"),
        })
        .collect();

    // 6. Calculate Summaries
    let total_sold_quantity: i64 = sales.iter().map(|s| s.quantity).sum();
    let gross_sales_piasters: i64 = sales.iter().map(|s| s.line_total_piasters).sum();
    let total_refunded_quantity: i64 = returns.iter().map(|r| r.quantity).sum();
    let total_refunded_piasters: i64 = returns.iter().map(|r| r.line_total_piasters).sum();
    let net_sales_piasters = gross_sales_piasters - total_refunded_piasters;

    let mut unique_invoices = std::collections::HashSet::new();
    let mut unique_customers = std::collections::HashSet::new();
    let mut unique_sellers = std::collections::HashSet::new();

    for s in &sales {
        unique_invoices.insert(s.invoice_id);
        unique_customers.insert(s.customer_id);
        unique_sellers.insert(s.seller_id);
    }
    for r in &returns {
        unique_customers.insert(r.customer_id);
        unique_sellers.insert(r.seller_id);
    }

    let summary = ProductMovementSummary {
        product_id: input.product_id,
        product_name,
        barcode,
        category_name,
        total_sold_quantity,
        gross_sales_piasters,
        net_sales_piasters,
        total_refunded_quantity,
        total_refunded_piasters,
        current_stock,
        total_invoices_count: unique_invoices.len() as i64,
        distinct_customers_count: unique_customers.len() as i64,
        distinct_sellers_count: unique_sellers.len() as i64,
    };

    Ok(ProductMovementReportView {
        summary,
        sales,
        returns,
        stock_movements,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramSettingsView {
    configured: bool,
    chat_id: String,
    grace_minutes: i64,
    pending_alerts: i64,
    auto_report_enabled: bool,
    auto_report_time: String,
    auto_report_last_sent_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceView {
    shift_date: String,
    shift_start: String,
    shift_end: String,
    checked_in_at: Option<String>,
    checked_out_at: Option<String>,
    late_minutes: i64,
    telegram_status: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoanView {
    id: i64,
    amount_piasters: i64,
    repaid_piasters: i64,
    remaining_piasters: i64,
    reason: Option<String>,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RewardView {
    id: i64,
    amount_piasters: i64,
    reason: String,
    period_month: String,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeductionView {
    id: i64,
    amount_piasters: i64,
    reason: String,
    period_month: String,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoanRepaymentView {
    id: i64,
    loan_id: i64,
    amount_piasters: i64,
    period_month: String,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeAccountView {
    employee_id: i64,
    employee_name: String,
    period_month: String,
    base_salary_piasters: i64,
    rewards_piasters: i64,
    deductions_piasters: i64,
    loan_repayments_piasters: i64,
    net_salary_piasters: i64,
    total_loan_balance_piasters: i64,
    attendance: Vec<AttendanceView>,
    loans: Vec<LoanView>,
    rewards: Vec<RewardView>,
    deductions: Vec<DeductionView>,
    loan_repayments: Vec<LoanRepaymentView>,
}

fn valid_period_month(value: &str) -> Result<&str, String> {
    let bytes = value.as_bytes();
    if bytes.len() == 7 && bytes[4] == b'-'
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[5..].iter().all(u8::is_ascii_digit)
        && value[5..].parse::<u32>().is_ok_and(|month| (1..=12).contains(&month)) {
        Ok(value)
    } else {
        Err("الشهر يجب أن يكون بصيغة YYYY-MM".into())
    }
}

fn attendance_shift_date(now: &DateTime<Tz>, start: NaiveTime, end: NaiveTime) -> NaiveDate {
    if start > end && now.time() < end {
        now.date_naive() - Duration::days(1)
    } else {
        now.date_naive()
    }
}

async fn employee_shift(pool: &SqlitePool, user_id: i64) -> Result<(i64, String, NaiveTime, NaiveTime), String> {
    let row = sqlx::query("SELECT id, name, shift_start, shift_end FROM employees WHERE user_id = ? AND is_active = 1")
        .bind(user_id).fetch_optional(pool).await.map_err(db_error)?.ok_or("لا يوجد ملف موظف نشط لهذا الحساب")?;
    let start_text: String = row.get("shift_start");
    let end_text: String = row.get("shift_end");
    let start = NaiveTime::parse_from_str(&start_text, "%H:%M").map_err(|_| "موعد الحضور غير صحيح")?;
    let end = NaiveTime::parse_from_str(&end_text, "%H:%M").map_err(|_| "موعد الانصراف غير صحيح")?;
    Ok((row.get("id"), row.get("name"), start, end))
}

async fn attendance_view(pool: &SqlitePool, employee_id: i64, shift_date: NaiveDate, start: NaiveTime, end: NaiveTime) -> Result<AttendanceView, String> {
    let row = sqlx::query("SELECT checked_in_at, checked_out_at, late_minutes, telegram_status FROM attendance WHERE employee_id = ? AND shift_date = ?")
        .bind(employee_id).bind(shift_date.format("%Y-%m-%d").to_string())
        .fetch_optional(pool).await.map_err(db_error)?;
    Ok(AttendanceView {
        shift_date: shift_date.format("%Y-%m-%d").to_string(),
        shift_start: start.format("%H:%M").to_string(),
        shift_end: end.format("%H:%M").to_string(),
        checked_in_at: row.as_ref().map(|r| r.get("checked_in_at")),
        checked_out_at: row.as_ref().and_then(|r| r.get("checked_out_at")),
        late_minutes: row.as_ref().map_or(0, |r| r.get("late_minutes")),
        telegram_status: row.as_ref().map(|r| r.get("telegram_status")),
    })
}

#[tauri::command]
pub async fn get_my_attendance(state: tauri::State<'_, AppState>, token: String) -> Result<AttendanceView, String> {
    let user = state.user(&token, false)?;
    let (employee_id, _, start, end) = employee_shift(&state.pool, user.user_id).await?;
    let date = attendance_shift_date(&Utc::now().with_timezone(&Cairo), start, end);
    attendance_view(&state.pool, employee_id, date, start, end).await
}

async fn employee_shift_by_id(pool: &SqlitePool, employee_id: i64) -> Result<(String, NaiveTime, NaiveTime), String> {
    let row = sqlx::query("SELECT name, shift_start, shift_end FROM employees WHERE id = ? AND is_active = 1")
        .bind(employee_id).fetch_optional(pool).await.map_err(db_error)?.ok_or("الموظف غير موجود أو غير نشط")?;
    let start_text: String = row.get("shift_start");
    let end_text: String = row.get("shift_end");
    let start = NaiveTime::parse_from_str(&start_text, "%H:%M").map_err(|_| "موعد الحضور غير صحيح")?;
    let end = NaiveTime::parse_from_str(&end_text, "%H:%M").map_err(|_| "موعد الانصراف غير صحيح")?;
    Ok((row.get("name"), start, end))
}

async fn perform_employee_check_in(pool: &SqlitePool, employee_id: i64) -> Result<AttendanceView, String> {
    let (_, start, end) = employee_shift_by_id(pool, employee_id).await?;
    let now = Utc::now().with_timezone(&Cairo);
    let shift_date = attendance_shift_date(&now, start, end);
    let scheduled = shift_date.and_time(start);
    let seconds_late = (now.naive_local() - scheduled).num_seconds().max(0);
    let grace: i64 = sqlx::query_scalar("SELECT grace_minutes FROM telegram_settings WHERE id = 1")
        .fetch_one(pool).await.map_err(db_error)?;
    let late_minutes = if seconds_late > grace * 60 { (seconds_late + 59) / 60 } else { 0 };
    let telegram_status = if late_minutes > 0 { "PENDING" } else { "NOT_REQUIRED" };
    let inserted = sqlx::query(
        "INSERT INTO attendance(employee_id, shift_date, checked_in_at, late_minutes, telegram_status)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT(employee_id, shift_date) DO NOTHING",
    ).bind(employee_id).bind(shift_date.format("%Y-%m-%d").to_string())
        .bind(now.to_rfc3339()).bind(late_minutes).bind(telegram_status)
        .execute(pool).await.map_err(db_error)?;
    if inserted.rows_affected() == 0 { return Err("تم إثبات الحضور لهذا الموظف في هذه الوردية بالفعل".into()); }
    if late_minutes > 0 {
        let attendance_id = inserted.last_insert_rowid();
        let pool_clone = pool.clone();
        tauri::async_runtime::spawn(async move { let _ = deliver_staff_alert(&pool_clone, attendance_id).await; });
    }
    attendance_view(pool, employee_id, shift_date, start, end).await
}

async fn perform_employee_check_out(pool: &SqlitePool, employee_id: i64) -> Result<AttendanceView, String> {
    let (_, start, end) = employee_shift_by_id(pool, employee_id).await?;
    let now = Utc::now().with_timezone(&Cairo);
    let shift_date = attendance_shift_date(&now, start, end);
    let changed = sqlx::query("UPDATE attendance SET checked_out_at = ? WHERE employee_id = ? AND shift_date = ? AND checked_out_at IS NULL")
        .bind(now.to_rfc3339()).bind(employee_id).bind(shift_date.format("%Y-%m-%d").to_string())
        .execute(pool).await.map_err(db_error)?;
    if changed.rows_affected() == 0 { return Err("لا يوجد حضور مفتوح لهذا الموظف في هذه الوردية أو تم إثبات الانصراف بالفعل".into()); }
    attendance_view(pool, employee_id, shift_date, start, end).await
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyEmployeeAttendanceView {
    pub employee_id: i64,
    pub user_id: Option<i64>,
    pub name: String,
    pub job_title: String,
    pub phone: Option<String>,
    pub shift_start: String,
    pub shift_end: String,
    pub work_hours: i64,
    pub shift_date: String,
    pub checked_in_at: Option<String>,
    pub checked_out_at: Option<String>,
    pub late_minutes: i64,
    pub status: String,
}

#[tauri::command]
pub async fn get_daily_attendance(
    state: tauri::State<'_, AppState>,
    token: String,
    date: Option<String>,
) -> Result<Vec<DailyEmployeeAttendanceView>, String> {
    let user = state.user_with_permission(&token, "attendance")?;
    let now = Utc::now().with_timezone(&Cairo);
    let target_date = match date.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(d) => NaiveDate::parse_from_str(d, "%Y-%m-%d").map_err(|_| "تاريخ غير صحيح")?,
        None => now.date_naive(),
    };
    let target_date_str = target_date.format("%Y-%m-%d").to_string();

    let rows = sqlx::query(
        "SELECT
            e.id AS employee_id,
            e.user_id,
            e.name,
            e.job_title,
            e.phone,
            e.shift_start,
            e.shift_end,
            e.work_hours,
            a.checked_in_at,
            a.checked_out_at,
            COALESCE(a.late_minutes, 0) AS late_minutes
         FROM employees e
         LEFT JOIN attendance a ON a.employee_id = e.id AND a.shift_date = ?
         WHERE e.is_active = 1
           AND (
             e.user_id IS NULL OR NOT EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = e.user_id
                 AND (u.permissions LIKE '%main_cashier%' OR u.role = 'ADMIN')
             )
           )
           AND (e.user_id IS NULL OR e.user_id != ?)
         ORDER BY e.name ASC"
    )
    .bind(&target_date_str)
    .bind(user.user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let checked_in_at: Option<String> = row.get("checked_in_at");
        let checked_out_at: Option<String> = row.get("checked_out_at");
        let late_minutes: i64 = row.get("late_minutes");

        let status = if checked_out_at.is_some() {
            "COMPLETED".to_string()
        } else if checked_in_at.is_some() {
            "PRESENT".to_string()
        } else {
            "NOT_ATTENDED".to_string()
        };

        result.push(DailyEmployeeAttendanceView {
            employee_id: row.get("employee_id"),
            user_id: row.get("user_id"),
            name: row.get("name"),
            job_title: row.get("job_title"),
            phone: row.get("phone"),
            shift_start: row.get("shift_start"),
            shift_end: row.get("shift_end"),
            work_hours: row.get("work_hours"),
            shift_date: target_date_str.clone(),
            checked_in_at,
            checked_out_at,
            late_minutes,
            status,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn check_in_employee(
    state: tauri::State<'_, AppState>,
    token: String,
    employee_id: i64,
) -> Result<AttendanceView, String> {
    let _user = state.user_with_permission(&token, "attendance")?;
    perform_employee_check_in(&state.pool, employee_id).await
}

#[tauri::command]
pub async fn check_out_employee(
    state: tauri::State<'_, AppState>,
    token: String,
    employee_id: i64,
) -> Result<AttendanceView, String> {
    let _user = state.user_with_permission(&token, "attendance")?;
    perform_employee_check_out(&state.pool, employee_id).await
}

#[tauri::command]
pub async fn reset_employee_attendance(
    state: tauri::State<'_, AppState>,
    token: String,
    employee_id: i64,
    date: String,
) -> Result<(), String> {
    let _user = state.user_with_permission(&token, "attendance")?;
    let target_date = NaiveDate::parse_from_str(date.trim(), "%Y-%m-%d").map_err(|_| "تاريخ غير صحيح")?;
    sqlx::query("DELETE FROM attendance WHERE employee_id = ? AND shift_date = ?")
        .bind(employee_id)
        .bind(target_date.format("%Y-%m-%d").to_string())
        .execute(&state.pool)
        .await
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn check_in(state: tauri::State<'_, AppState>, token: String) -> Result<AttendanceView, String> {
    let user = state.user(&token, false)?;
    let (employee_id, _, _, _) = employee_shift(&state.pool, user.user_id).await?;
    perform_employee_check_in(&state.pool, employee_id).await
}

#[tauri::command]
pub async fn check_out(state: tauri::State<'_, AppState>, token: String) -> Result<AttendanceView, String> {
    let user = state.user(&token, false)?;
    let (employee_id, _, _, _) = employee_shift(&state.pool, user.user_id).await?;
    perform_employee_check_out(&state.pool, employee_id).await
}

async fn telegram_send(bot_token: &str, chat_id: &str, message: &str) -> Result<(), String> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(8))
        .build().map_err(|_| "تعذر تجهيز اتصال تليجرام")?;
    let url = format!("https://api.telegram.org/bot{bot_token}/sendMessage");
    let response = client.post(url).json(&serde_json::json!({ "chat_id": chat_id, "text": message }))
        .send().await.map_err(|_| "تعذر الاتصال بتليجرام")?;
    let result: serde_json::Value = response.json().await.map_err(|_| "استجابة تليجرام غير صحيحة")?;
    if result.get("ok").and_then(|v| v.as_bool()) == Some(true) { Ok(()) }
    else { Err("رفض تليجرام إرسال الرسالة؛ راجع رمز البوت ومعرّف المحادثة".into()) }
}

fn format_late_duration(seconds: i64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let seconds = seconds % 60;
    let mut parts = Vec::new();
    if hours > 0 { parts.push(format!("{hours} ساعة")); }
    if minutes > 0 { parts.push(format!("{minutes} دقيقة")); }
    if seconds > 0 || parts.is_empty() { parts.push(format!("{seconds} ثانية")); }
    parts.join(" و")
}

async fn deliver_staff_alert(pool: &SqlitePool, attendance_id: i64) -> Result<(), String> {
    let claimed = sqlx::query(
        "UPDATE attendance SET telegram_status = 'SENDING' WHERE id = ? AND late_minutes > 0
         AND telegram_status IN ('PENDING', 'FAILED', 'UNCONFIGURED')",
    ).bind(attendance_id).execute(pool).await.map_err(db_error)?;
    if claimed.rows_affected() == 0 { return Ok(()); }
    let row = sqlx::query(
        "SELECT a.id, a.shift_date, a.checked_in_at, a.late_minutes, e.name, e.shift_start,
                s.bot_token, s.chat_id
         FROM attendance a JOIN employees e ON e.id = a.employee_id
         JOIN telegram_settings s ON s.id = 1
         WHERE a.id = ? AND a.late_minutes > 0 AND a.telegram_status = 'SENDING'",
    ).bind(attendance_id).fetch_optional(pool).await.map_err(db_error)?;
    let Some(row) = row else { return Ok(()); };
    let token: String = row.get("bot_token");
    let chat_id: String = row.get("chat_id");
    if token.is_empty() || chat_id.is_empty() {
        sqlx::query("UPDATE attendance SET telegram_status = 'UNCONFIGURED' WHERE id = ?")
            .bind(attendance_id).execute(pool).await.map_err(db_error)?;
        return Ok(());
    }
    let shift_date: String = row.get("shift_date");
    let shift_start: String = row.get("shift_start");
    let checked_in_at: String = row.get("checked_in_at");
    let actual = DateTime::parse_from_rfc3339(&checked_in_at).map_err(|_| "وقت الحضور المسجل غير صحيح")?.with_timezone(&Cairo);
    let scheduled_date = NaiveDate::parse_from_str(&shift_date, "%Y-%m-%d").map_err(|_| "تاريخ الوردية غير صحيح")?;
    let scheduled_time = NaiveTime::parse_from_str(&shift_start, "%H:%M").map_err(|_| "موعد الحضور غير صحيح")?;
    let seconds_late = (actual.naive_local() - scheduled_date.and_time(scheduled_time)).num_seconds().max(0);
    let (sched_pm, sched_h12) = scheduled_time.hour12();
    let sched_str = format!("{}:{:02} {}", sched_h12, scheduled_time.minute(), if sched_pm { "م" } else { "ص" });
    let (act_pm, act_h12) = actual.time().hour12();
    let act_str = format!("{}:{:02}:{:02} {}", act_h12, actual.minute(), actual.second(), if act_pm { "م" } else { "ص" });
    let message = format!(
        "تنبيه تأخير موظف\nالاسم: {}\nتاريخ الوردية: {}\nموعد الحضور: {}\nوقت الحضور الفعلي: {}\nمدة التأخير: {}",
        row.get::<String, _>("name"), shift_date, sched_str,
        act_str, format_late_duration(seconds_late),
    );
    let sent = telegram_send(&token, &chat_id, &message).await.is_ok();
    sqlx::query("UPDATE attendance SET telegram_status = ? WHERE id = ?")
        .bind(if sent { "SENT" } else { "FAILED" }).bind(attendance_id)
        .execute(pool).await.map_err(db_error)?;
    Ok(())
}

async fn retry_staff_alerts(pool: &SqlitePool) -> Result<i64, String> {
    let ids: Vec<i64> = sqlx::query_scalar(
        "SELECT id FROM attendance WHERE late_minutes > 0 AND telegram_status IN ('PENDING', 'FAILED', 'UNCONFIGURED') ORDER BY id LIMIT 100",
    ).fetch_all(pool).await.map_err(db_error)?;
    for id in &ids { let _ = deliver_staff_alert(pool, *id).await; }
    Ok(ids.len() as i64)
}

#[tauri::command]
pub async fn get_telegram_settings(state: tauri::State<'_, AppState>, token: String) -> Result<TelegramSettingsView, String> {
    state.user(&token, true)?;
    let row = sqlx::query("SELECT bot_token, chat_id, grace_minutes, auto_report_enabled, auto_report_time, auto_report_last_sent_date FROM telegram_settings WHERE id = 1")
        .fetch_one(&state.pool).await.map_err(db_error)?;
    let bot_token: String = row.get("bot_token");
    let chat_id: String = row.get("chat_id");
    let auto_report_enabled: i64 = row.get("auto_report_enabled");
    let auto_report_time: String = row.get("auto_report_time");
    let auto_report_last_sent_date: Option<String> = row.get("auto_report_last_sent_date");
    let pending_alerts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM attendance WHERE late_minutes > 0 AND telegram_status IN ('PENDING', 'FAILED', 'UNCONFIGURED')",
    ).fetch_one(&state.pool).await.map_err(db_error)?;
    Ok(TelegramSettingsView {
        configured: !bot_token.is_empty() && !chat_id.is_empty(),
        chat_id,
        grace_minutes: row.get("grace_minutes"),
        pending_alerts,
        auto_report_enabled: auto_report_enabled != 0,
        auto_report_time,
        auto_report_last_sent_date,
    })
}

#[tauri::command]
pub async fn configure_telegram(
    state: tauri::State<'_, AppState>, token: String,
    bot_token: Option<String>, chat_id: String, grace_minutes: i64,
    auto_report_enabled: Option<bool>, auto_report_time: Option<String>,
) -> Result<(), String> {
    state.user(&token, true)?;
    if !(0..=180).contains(&grace_minutes) { return Err("فترة السماح يجب أن تكون بين 0 و180 دقيقة".into()); }
    let bot_token = bot_token.unwrap_or_default().trim().to_owned();
    let chat_id = chat_id.trim();
    if bot_token.len() > 200 || chat_id.len() > 100 { return Err("بيانات تليجرام طويلة جدًا".into()); }

    let auto_enabled = auto_report_enabled.unwrap_or(false);
    let auto_time = auto_report_time.as_deref().unwrap_or("23:00").trim();
    if NaiveTime::parse_from_str(auto_time, "%H:%M").is_err() {
        return Err("تنسيق وقت التقرير غير صحيح (يجب أن يكون بالساعة والدقيقة مثل 23:00)".into());
    }

    if !bot_token.is_empty() {
        sqlx::query("UPDATE telegram_settings SET bot_token = ?, chat_id = ?, grace_minutes = ?, auto_report_enabled = ?, auto_report_time = ? WHERE id = 1")
            .bind(bot_token).bind(chat_id).bind(grace_minutes).bind(if auto_enabled { 1 } else { 0 }).bind(auto_time).execute(&state.pool).await.map_err(db_error)?;
    } else {
        sqlx::query("UPDATE telegram_settings SET chat_id = ?, grace_minutes = ?, auto_report_enabled = ?, auto_report_time = ? WHERE id = 1")
            .bind(chat_id).bind(grace_minutes).bind(if auto_enabled { 1 } else { 0 }).bind(auto_time).execute(&state.pool).await.map_err(db_error)?;
    }
    let pool = state.pool.clone();
    tauri::async_runtime::spawn(async move { let _ = retry_staff_alerts(&pool).await; });
    Ok(())
}

#[tauri::command]
pub async fn test_telegram(state: tauri::State<'_, AppState>, token: String) -> Result<(), String> {
    state.user(&token, true)?;
    let row = sqlx::query("SELECT bot_token, chat_id FROM telegram_settings WHERE id = 1")
        .fetch_one(&state.pool).await.map_err(db_error)?;
    let bot_token: String = row.get("bot_token");
    let chat_id: String = row.get("chat_id");
    if bot_token.is_empty() || chat_id.is_empty() { return Err("احفظ رمز البوت ومعرّف محادثة المدير أولًا".into()); }
    telegram_send(&bot_token, &chat_id, "رسالة اختبار من نظام مرسي للكاشير: تنبيهات التأخير جاهزة.").await
}

#[tauri::command]
pub async fn retry_telegram_alerts(state: tauri::State<'_, AppState>, token: String) -> Result<i64, String> {
    state.user(&token, true)?;
    retry_staff_alerts(&state.pool).await
}

fn format_egp(piasters: i64) -> String {
    let pounds = (piasters as f64) / 100.0;
    let is_neg = pounds < 0.0;
    let abs_pounds = pounds.abs();
    let int_part = abs_pounds.trunc() as i64;
    let frac_part = (abs_pounds.fract() * 100.0).round() as i64;

    let int_str = int_part.to_string();
    let mut formatted_int = String::new();
    let chars: Vec<char> = int_str.chars().collect();
    let len = chars.len();
    for (i, ch) in chars.iter().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            formatted_int.push(',');
        }
        formatted_int.push(*ch);
    }

    let sign = if is_neg { "-" } else { "" };
    if frac_part > 0 {
        format!("{sign}{formatted_int}.{frac_part:02} ج.م")
    } else {
        format!("{sign}{formatted_int} ج.م")
    }
}

fn format_time_cairo(rfc3339_or_naive: &str) -> String {
    if let Ok(dt) = DateTime::parse_from_rfc3339(rfc3339_or_naive) {
        let cairo_dt = dt.with_timezone(&Cairo);
        let (pm, h12) = cairo_dt.time().hour12();
        let period = if pm { "م" } else { "ص" };
        format!("{}:{:02} {}", h12, cairo_dt.minute(), period)
    } else if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(rfc3339_or_naive, "%Y-%m-%d %H:%M:%S") {
        let (pm, h12) = ndt.time().hour12();
        let period = if pm { "م" } else { "ص" };
        format!("{}:{:02} {}", h12, ndt.minute(), period)
    } else {
        rfc3339_or_naive.to_string()
    }
}

async fn generate_and_send_daily_report(
    pool: &SqlitePool,
    date: Option<String>,
    sender_name: Option<&str>,
) -> Result<String, String> {
    let row = sqlx::query("SELECT bot_token, chat_id FROM telegram_settings WHERE id = 1")
        .fetch_one(pool).await.map_err(db_error)?;
    let bot_token: String = row.get("bot_token");
    let chat_id: String = row.get("chat_id");
    if bot_token.trim().is_empty() || chat_id.trim().is_empty() {
        return Err("بيانات تليجرام غير مهيأة. يرجى إدخال رمز البوت (Bot Token) ومعرّف محادثة المدير (Chat ID) أولاً من صفحة الموظفين > إعدادات التليجرام.".into());
    }

    let now = Utc::now().with_timezone(&Cairo);
    let target_date = match date.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(d) => NaiveDate::parse_from_str(d, "%Y-%m-%d").map_err(|_| "تاريخ غير صحيح")?,
        None => now.date_naive(),
    };
    let target_date_str = target_date.format("%Y-%m-%d").to_string();

    let inv_row = sqlx::query(
        "SELECT
            COUNT(*) AS cnt,
            COALESCE(SUM(subtotal_piasters), 0) AS subtotal,
            COALESCE(SUM(discount_piasters), 0) AS discount,
            COALESCE(SUM(total_piasters), 0) AS gross_sales,
            COALESCE(SUM(paid_cash_piasters), 0) AS paid_cash,
            COALESCE(SUM(paid_instapay_piasters), 0) AS paid_instapay,
            COALESCE(SUM(paid_wallet_piasters), 0) AS paid_wallet,
            COALESCE(SUM(remaining_piasters), 0) AS remaining
         FROM invoices
         WHERE status = 'COMPLETED' AND date(created_at, 'localtime') = ?"
    )
    .bind(&target_date_str)
    .fetch_one(pool)
    .await
    .map_err(db_error)?;

    let inv_count: i64 = inv_row.get("cnt");
    let gross_sales: i64 = inv_row.get("gross_sales");
    let total_discounts: i64 = inv_row.get("discount");
    let paid_cash: i64 = inv_row.get("paid_cash");
    let paid_instapay: i64 = inv_row.get("paid_instapay");
    let paid_wallet: i64 = inv_row.get("paid_wallet");
    let credit_sales: i64 = inv_row.get("remaining");

    let ref_row = sqlx::query(
        "SELECT
            COUNT(*) AS cnt,
            COALESCE(SUM(total_refund_piasters), 0) AS total_refunds,
            COALESCE(SUM(CASE WHEN refund_method = 'CASH' THEN total_refund_piasters ELSE 0 END), 0) AS ref_cash,
            COALESCE(SUM(CASE WHEN refund_method = 'INSTAPAY' THEN total_refund_piasters ELSE 0 END), 0) AS ref_instapay,
            COALESCE(SUM(CASE WHEN refund_method = 'WALLET' THEN total_refund_piasters ELSE 0 END), 0) AS ref_wallet
         FROM refunds
         WHERE date(created_at, 'localtime') = ?"
    )
    .bind(&target_date_str)
    .fetch_one(pool)
    .await
    .map_err(db_error)?;

    let refund_count: i64 = ref_row.get("cnt");
    let total_refunds: i64 = ref_row.get("total_refunds");
    let ref_cash: i64 = ref_row.get("ref_cash");
    let ref_instapay: i64 = ref_row.get("ref_instapay");
    let ref_wallet: i64 = ref_row.get("ref_wallet");

    let debt_row = sqlx::query(
        "SELECT
            COUNT(*) AS cnt,
            COALESCE(SUM(amount_piasters), 0) AS total_debt,
            COALESCE(SUM(CASE WHEN method = 'CASH' THEN amount_piasters ELSE 0 END), 0) AS debt_cash,
            COALESCE(SUM(CASE WHEN method = 'INSTAPAY' THEN amount_piasters ELSE 0 END), 0) AS debt_instapay,
            COALESCE(SUM(CASE WHEN method = 'WALLET' THEN amount_piasters ELSE 0 END), 0) AS debt_wallet
         FROM customer_payments
         WHERE date(created_at, 'localtime') = ?"
    )
    .bind(&target_date_str)
    .fetch_one(pool)
    .await
    .map_err(db_error)?;

    let total_debt_collected: i64 = debt_row.get("total_debt");
    let debt_cash: i64 = debt_row.get("debt_cash");
    let debt_instapay: i64 = debt_row.get("debt_instapay");
    let debt_wallet: i64 = debt_row.get("debt_wallet");

    let net_sales = gross_sales - total_refunds;
    let net_cash = paid_cash - ref_cash + debt_cash;
    let net_instapay = paid_instapay - ref_instapay + debt_instapay;
    let net_wallet = paid_wallet - ref_wallet + debt_wallet;
    let total_collected = net_cash + net_instapay + net_wallet;

    struct SellerStat {
        name: String,
        count: i64,
        total: i64,
    }

    let seller_rows = sqlx::query(
        "SELECT
            COALESCE(e.name, u.full_name, 'كاشير المحل') AS seller_name,
            COUNT(*) AS cnt,
            COALESCE(SUM(i.total_piasters), 0) AS total_piasters
         FROM invoices i
         LEFT JOIN employees e ON e.id = i.employee_id
         LEFT JOIN users u ON u.id = i.seller_id
         WHERE i.status = 'COMPLETED' AND date(i.created_at, 'localtime') = ?
         GROUP BY seller_name
         ORDER BY total_piasters DESC"
    )
    .bind(&target_date_str)
    .fetch_all(pool)
    .await
    .map_err(db_error)?;

    let sellers: Vec<SellerStat> = seller_rows
        .into_iter()
        .map(|r| SellerStat {
            name: r.get("seller_name"),
            count: r.get("cnt"),
            total: r.get("total_piasters"),
        })
        .collect();

    let online_row = sqlx::query(
        "SELECT
            COUNT(*) AS cnt,
            COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END), 0) AS confirmed,
            COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending
         FROM online_orders
         WHERE date(created_at, 'localtime') = ?"
    )
    .bind(&target_date_str)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    let (online_count, online_confirmed, online_pending) = match online_row {
        Some(r) => (r.get::<i64, _>("cnt"), r.get::<i64, _>("confirmed"), r.get::<i64, _>("pending")),
        None => (0, 0, 0),
    };

    struct StaffAttRow {
        name: String,
        checked_in_at: Option<String>,
        checked_out_at: Option<String>,
        late_minutes: i64,
    }

    let staff_rows = sqlx::query(
        "SELECT
            e.name,
            a.checked_in_at,
            a.checked_out_at,
            COALESCE(a.late_minutes, 0) AS late_minutes
         FROM employees e
         LEFT JOIN attendance a ON a.employee_id = e.id AND a.shift_date = ?
         WHERE e.is_active = 1
           AND (
             e.user_id IS NULL OR NOT EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = e.user_id
                 AND (u.permissions LIKE '%main_cashier%' OR u.role = 'ADMIN')
             )
           )
         ORDER BY e.name ASC"
    )
    .bind(&target_date_str)
    .fetch_all(pool)
    .await
    .map_err(db_error)?;

    let staff: Vec<StaffAttRow> = staff_rows
        .into_iter()
        .map(|r| StaffAttRow {
            name: r.get("name"),
            checked_in_at: r.get("checked_in_at"),
            checked_out_at: r.get("checked_out_at"),
            late_minutes: r.get("late_minutes"),
        })
        .collect();

    let (now_pm, now_h12) = now.time().hour12();
    let now_period = if now_pm { "م" } else { "ص" };
    let now_str = format!("{}:{:02} {}", now_h12, now.minute(), now_period);

    let mut msg = String::new();
    let is_auto = sender_name.is_none();
    if is_auto {
        msg.push_str("🤖 تقرير إغلاق ومبيعات اليوم التلقائي - MORSI FOR BELT\n");
    } else {
        msg.push_str("📊 تقرير إغلاق ومبيعات اليوم - MORSI FOR BELT\n");
    }
    msg.push_str(&format!("📅 التاريخ: {}\n", target_date_str));
    msg.push_str(&format!("⏰ وقت الإرسال: {}\n", now_str));
    if let Some(s_name) = sender_name {
        msg.push_str(&format!("👤 مرسل التقرير: {}\n", s_name));
    } else {
        msg.push_str("🤖 مرسل التقرير: نظام مرسي تلقائياً (إغلاق مجدول)\n");
    }
    msg.push_str("━━━━━━━━━━━━━━━━━━━\n\n");

    msg.push_str("💰 ملخص المبيعات والإيرادات:\n");
    msg.push_str(&format!("• إجمالي المبيعات (Gross): {} ({} فاتورة)\n", format_egp(gross_sales), inv_count));
    if total_discounts > 0 {
        msg.push_str(&format!("• إجمالي الخصومات الممنوحة: {}\n", format_egp(total_discounts)));
    }
    if total_refunds > 0 {
        msg.push_str(&format!("• إجمالي المرتجعات: {} ({} مرتجع)\n", format_egp(total_refunds), refund_count));
    }
    msg.push_str(&format!("• 💎 صافي المبيعات (Net): {}\n\n", format_egp(net_sales)));

    msg.push_str("💳 تفاصيل النقدية والمقبوضات اليوم:\n");
    msg.push_str(&format!("• 💵 نقداً (كاش الدرج): {}\n", format_egp(net_cash)));
    msg.push_str(&format!("• ⚡ إنستاباي (InstaPay): {}\n", format_egp(net_instapay)));
    msg.push_str(&format!("• 📱 محافظ إلكترونية (Wallet): {}\n", format_egp(net_wallet)));
    if credit_sales > 0 {
        msg.push_str(&format!("• ⏳ مبيعات آجلة (متبقي على عملاء): {}\n", format_egp(credit_sales)));
    }
    if total_debt_collected > 0 {
        msg.push_str(&format!("• 📥 تحصيل ديون سابقة: {}\n", format_egp(total_debt_collected)));
    }
    msg.push_str("━━━━━━━━━━━━━━━━━━━\n");
    msg.push_str(&format!("💵 إجمالي المبالغ المحصلة فعلياً: {}\n\n", format_egp(total_collected)));

    if !sellers.is_empty() {
        msg.push_str("👥 مبيعات البائعين اليوم:\n");
        for s in &sellers {
            msg.push_str(&format!("• {}: {} ({} فاتورة)\n", s.name, format_egp(s.total), s.count));
        }
        msg.push_str("\n");
    }

    if online_count > 0 {
        msg.push_str(&format!("📦 طلبات الأونلاين والشحن اليوم: {} طلب (معتمد: {} · قيد الانتظار: {})\n\n", online_count, online_confirmed, online_pending));
    }

    let present_count = staff.iter().filter(|s| s.checked_in_at.is_some()).count();
    let total_staff = staff.len();
    if total_staff > 0 {
        msg.push_str(&format!("📋 حضور الموظفين بالوردية ({}/{}):\n", present_count, total_staff));
        let mut has_present = false;
        let mut absent_names = Vec::new();
        for emp in &staff {
            if let Some(ref in_time) = emp.checked_in_at {
                has_present = true;
                let late_info = if emp.late_minutes > 0 {
                    format!(" · تأخير {} د", emp.late_minutes)
                } else {
                    " · في الموعد".to_string()
                };
                let formatted_in = format_time_cairo(in_time);
                let out_info = if let Some(ref out_time) = emp.checked_out_at {
                    format!(" ➔ انصراف {}", format_time_cairo(out_time))
                } else {
                    String::new()
                };
                msg.push_str(&format!("  - {} (حضور {}{}{})\n", emp.name, formatted_in, late_info, out_info));
            } else {
                absent_names.push(&emp.name);
            }
        }
        if !has_present {
            msg.push_str("  (لم يسجل أي موظف حضور اليوم حتى الآن)\n");
        }
        if !absent_names.is_empty() {
            msg.push_str("• لم يحضروا بعد:\n");
            for name in &absent_names {
                msg.push_str(&format!("  - {}\n", name));
            }
        }
        msg.push_str("━━━━━━━━━━━━━━━━━━━\n");
    }

    telegram_send(&bot_token, &chat_id, msg.trim_end()).await?;
    Ok(format!("تم إرسال تقرير اليوم ({}) إلى تليجرام المدير بنجاح ✅", target_date_str))
}

async fn run_auto_report_scheduler(pool: SqlitePool) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(30)).await;

        let row_res = sqlx::query(
            "SELECT bot_token, chat_id, auto_report_enabled, auto_report_time, auto_report_last_sent_date FROM telegram_settings WHERE id = 1"
        )
        .fetch_optional(&pool)
        .await;

        let row = match row_res {
            Ok(Some(r)) => r,
            _ => continue,
        };

        let auto_enabled: i64 = row.get("auto_report_enabled");
        if auto_enabled == 0 {
            continue;
        }

        let bot_token: String = row.get("bot_token");
        let chat_id: String = row.get("chat_id");
        if bot_token.trim().is_empty() || chat_id.trim().is_empty() {
            continue;
        }

        let auto_time_str: String = row.get("auto_report_time");
        let auto_time = match NaiveTime::parse_from_str(auto_time_str.trim(), "%H:%M") {
            Ok(t) => t,
            Err(_) => continue,
        };
        let last_sent_date: Option<String> = row.get("auto_report_last_sent_date");

        let now = Utc::now().with_timezone(&Cairo);
        let current_time = now.time();

        let (target_date, should_send) = if auto_time.hour() < 5 {
            let yesterday = (now.date_naive() - Duration::days(1)).format("%Y-%m-%d").to_string();
            let time_match = current_time >= auto_time && current_time.hour() < 5;
            let not_sent_yet = last_sent_date.as_deref() != Some(&yesterday);
            (yesterday, time_match && not_sent_yet)
        } else {
            let today = now.date_naive().format("%Y-%m-%d").to_string();
            let time_match = current_time >= auto_time;
            let not_sent_yet = last_sent_date.as_deref() != Some(&today);
            (today, time_match && not_sent_yet)
        };

        if should_send {
            match generate_and_send_daily_report(&pool, Some(target_date.clone()), None).await {
                Ok(_) => {
                    let _ = sqlx::query("UPDATE telegram_settings SET auto_report_last_sent_date = ? WHERE id = 1")
                        .bind(&target_date)
                        .execute(&pool)
                        .await;
                }
                Err(err) => {
                    eprintln!("Auto daily report scheduler error: {}", err);
                }
            }
        }
    }
}

#[tauri::command]
pub async fn send_daily_report_to_telegram(
    state: tauri::State<'_, AppState>,
    token: String,
    date: Option<String>,
) -> Result<String, String> {
    let user = state.user(&token, false)?;

    if user.role != "ADMIN"
        && !user.permissions.iter().any(|p| p == "home" || p == "sales_report" || p == "pos" || p == "main_cashier" || p == "attendance")
    {
        return Err("ليس لديك صلاحية لإرسال التقرير".into());
    }

    generate_and_send_daily_report(&state.pool, date, Some(&user.full_name)).await
}

#[tauri::command]
pub async fn get_employee_account(
    state: tauri::State<'_, AppState>, token: String, employee_id: i64, period_month: String,
) -> Result<EmployeeAccountView, String> {
    state.user(&token, true)?;
    let month = valid_period_month(&period_month)?;
    let employee = sqlx::query("SELECT id, name, base_salary_piasters FROM employees WHERE id = ?")
        .bind(employee_id).fetch_optional(&state.pool).await.map_err(db_error)?
        .ok_or("الموظف غير موجود")?;

    let loan_rows = sqlx::query(
        "SELECT l.id, l.amount_piasters, l.reason, l.created_at,
                COALESCE((SELECT SUM(r.amount_piasters) FROM employee_loan_repayments r WHERE r.loan_id = l.id), 0) AS repaid_piasters
         FROM employee_loans l WHERE l.employee_id = ? ORDER BY l.id DESC",
    ).bind(employee_id).fetch_all(&state.pool).await.map_err(db_error)?;
    let loans: Vec<LoanView> = loan_rows.iter().map(|r| {
        let amount: i64 = r.get("amount_piasters");
        let repaid: i64 = r.get("repaid_piasters");
        LoanView { id: r.get("id"), amount_piasters: amount, repaid_piasters: repaid,
            remaining_piasters: amount - repaid, reason: r.get("reason"), created_at: r.get("created_at") }
    }).collect();

    let reward_rows = sqlx::query(
        "SELECT id, amount_piasters, reason, COALESCE(period_month, substr(created_at, 1, 7)) AS period_month, created_at
         FROM employee_rewards WHERE employee_id = ? AND COALESCE(period_month, substr(created_at, 1, 7)) = ? ORDER BY id DESC",
    ).bind(employee_id).bind(month).fetch_all(&state.pool).await.map_err(db_error)?;
    let rewards: Vec<RewardView> = reward_rows.iter().map(|r| RewardView {
        id: r.get("id"), amount_piasters: r.get("amount_piasters"), reason: r.get("reason"),
        period_month: r.get("period_month"), created_at: r.get("created_at"),
    }).collect();

    let deduction_rows = sqlx::query(
        "SELECT id, amount_piasters, reason, COALESCE(period_month, substr(created_at, 1, 7)) AS period_month, created_at
         FROM employee_deductions WHERE employee_id = ? AND COALESCE(period_month, substr(created_at, 1, 7)) = ? ORDER BY id DESC",
    ).bind(employee_id).bind(month).fetch_all(&state.pool).await.map_err(db_error)?;
    let deductions: Vec<DeductionView> = deduction_rows.iter().map(|r| DeductionView {
        id: r.get("id"), amount_piasters: r.get("amount_piasters"), reason: r.get("reason"),
        period_month: r.get("period_month"), created_at: r.get("created_at"),
    }).collect();

    let repayment_rows = sqlx::query(
        "SELECT r.id, r.loan_id, r.amount_piasters,
                COALESCE(r.period_month, substr(r.created_at, 1, 7)) AS period_month, r.created_at
         FROM employee_loan_repayments r JOIN employee_loans l ON l.id = r.loan_id
         WHERE l.employee_id = ? AND COALESCE(r.period_month, substr(r.created_at, 1, 7)) = ? ORDER BY r.id DESC",
    ).bind(employee_id).bind(month).fetch_all(&state.pool).await.map_err(db_error)?;
    let loan_repayments: Vec<LoanRepaymentView> = repayment_rows.iter().map(|r| LoanRepaymentView {
        id: r.get("id"), loan_id: r.get("loan_id"), amount_piasters: r.get("amount_piasters"),
        period_month: r.get("period_month"), created_at: r.get("created_at"),
    }).collect();

    let attendance_rows = sqlx::query(
        "SELECT a.shift_date, a.checked_in_at, a.checked_out_at, a.late_minutes, a.telegram_status,
                e.shift_start, e.shift_end FROM attendance a JOIN employees e ON e.id = a.employee_id
         WHERE a.employee_id = ? AND substr(a.shift_date, 1, 7) = ? ORDER BY a.shift_date DESC",
    ).bind(employee_id).bind(month).fetch_all(&state.pool).await.map_err(db_error)?;
    let attendance = attendance_rows.iter().map(|r| AttendanceView {
        shift_date: r.get("shift_date"), shift_start: r.get("shift_start"), shift_end: r.get("shift_end"),
        checked_in_at: r.get("checked_in_at"), checked_out_at: r.get("checked_out_at"),
        late_minutes: r.get("late_minutes"), telegram_status: r.get("telegram_status"),
    }).collect();

    let base_salary_piasters: i64 = employee.get("base_salary_piasters");
    let rewards_piasters: i64 = rewards.iter().map(|r| r.amount_piasters).sum();
    let deductions_piasters: i64 = deductions.iter().map(|r| r.amount_piasters).sum();
    let loan_repayments_piasters: i64 = loan_repayments.iter().map(|r| r.amount_piasters).sum();
    let total_loan_balance_piasters: i64 = loans.iter().map(|r| r.remaining_piasters).sum();
    Ok(EmployeeAccountView {
        employee_id, employee_name: employee.get("name"), period_month: month.to_owned(),
        base_salary_piasters, rewards_piasters, deductions_piasters, loan_repayments_piasters,
        net_salary_piasters: base_salary_piasters + rewards_piasters - deductions_piasters - loan_repayments_piasters,
        total_loan_balance_piasters, attendance, loans, rewards, deductions, loan_repayments,
    })
}

#[tauri::command]
pub async fn create_employee_reward(
    state: tauri::State<'_, AppState>, token: String, employee_id: i64,
    amount_piasters: i64, reason: String, period_month: String,
) -> Result<i64, String> {
    let admin = state.user(&token, true)?;
    if amount_piasters <= 0 { return Err("قيمة المكافأة يجب أن تكون أكبر من صفر".into()); }
    let reason = clean_name(&reason)?;
    let month = valid_period_month(&period_month)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let id = sqlx::query("INSERT INTO employee_rewards(employee_id, amount_piasters, reason, created_by, period_month) VALUES (?, ?, ?, ?, ?)")
        .bind(employee_id).bind(amount_piasters).bind(reason).bind(admin.user_id).bind(month)
        .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_REWARD', 'employee_rewards', ?)")
        .bind(admin.user_id).bind(id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(id)
}

#[tauri::command]
pub async fn delete_employee_reward(
    state: tauri::State<'_, AppState>, token: String, reward_id: i64,
) -> Result<(), String> {
    let admin = state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let res = sqlx::query("DELETE FROM employee_rewards WHERE id = ?")
        .bind(reward_id).execute(&mut *tx).await.map_err(db_error)?;
    if res.rows_affected() == 0 {
        return Err("سجل المكافأة غير موجود".into());
    }
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_REWARD_DELETE', 'employee_rewards', ?)")
        .bind(admin.user_id).bind(reward_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn create_employee_loan(
    state: tauri::State<'_, AppState>, token: String, employee_id: i64,
    amount_piasters: i64, reason: Option<String>, period_month: Option<String>,
) -> Result<i64, String> {
    let admin = state.user(&token, true)?;
    if amount_piasters <= 0 { return Err("قيمة السلفة يجب أن تكون أكبر من صفر".into()); }
    let month_str = match &period_month {
        Some(m) if !m.trim().is_empty() => valid_period_month(m.trim())?.to_string(),
        _ => chrono::Local::now().format("%Y-%m").to_string(),
    };
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let loan_id = sqlx::query("INSERT INTO employee_loans(employee_id, amount_piasters, reason, created_by) VALUES (?, ?, ?, ?)")
        .bind(employee_id).bind(amount_piasters).bind(reason.as_deref().map(str::trim))
        .bind(admin.user_id).execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();

    // Automatically record loan repayment so it deducts directly from the salary of period_month
    sqlx::query("INSERT INTO employee_loan_repayments(loan_id, amount_piasters, created_by, period_month) VALUES (?, ?, ?, ?)")
        .bind(loan_id).bind(amount_piasters).bind(admin.user_id).bind(&month_str)
        .execute(&mut *tx).await.map_err(db_error)?;

    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_LOAN', 'employee_loans', ?)")
        .bind(admin.user_id).bind(loan_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(loan_id)
}

#[tauri::command]
pub async fn delete_employee_loan(
    state: tauri::State<'_, AppState>, token: String, loan_id: i64,
) -> Result<(), String> {
    let admin = state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    sqlx::query("DELETE FROM employee_loan_repayments WHERE loan_id = ?")
        .bind(loan_id).execute(&mut *tx).await.map_err(db_error)?;
    let res = sqlx::query("DELETE FROM employee_loans WHERE id = ?")
        .bind(loan_id).execute(&mut *tx).await.map_err(db_error)?;
    if res.rows_affected() == 0 {
        return Err("سجل السلفة غير موجود".into());
    }
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_LOAN_DELETE', 'employee_loans', ?)")
        .bind(admin.user_id).bind(loan_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn create_employee_deduction(
    state: tauri::State<'_, AppState>, token: String, employee_id: i64,
    amount_piasters: i64, reason: String, period_month: String,
) -> Result<i64, String> {
    let admin = state.user(&token, true)?;
    if amount_piasters <= 0 { return Err("قيمة الخصم يجب أن تكون أكبر من صفر".into()); }
    let reason = clean_name(&reason)?;
    let month = valid_period_month(&period_month)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let id = sqlx::query("INSERT INTO employee_deductions(employee_id, amount_piasters, reason, created_by, period_month) VALUES (?, ?, ?, ?, ?)")
        .bind(employee_id).bind(amount_piasters).bind(reason).bind(admin.user_id).bind(month)
        .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_DEDUCTION', 'employee_deductions', ?)")
        .bind(admin.user_id).bind(id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(id)
}

#[tauri::command]
pub async fn delete_employee_deduction(
    state: tauri::State<'_, AppState>, token: String, deduction_id: i64,
) -> Result<(), String> {
    let admin = state.user(&token, true)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let res = sqlx::query("DELETE FROM employee_deductions WHERE id = ?")
        .bind(deduction_id).execute(&mut *tx).await.map_err(db_error)?;
    if res.rows_affected() == 0 {
        return Err("سجل الخصم غير موجود".into());
    }
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_DEDUCTION_DELETE', 'employee_deductions', ?)")
        .bind(admin.user_id).bind(deduction_id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn record_employee_loan_repayment(
    state: tauri::State<'_, AppState>, token: String, loan_id: i64,
    amount_piasters: i64, period_month: String,
) -> Result<i64, String> {
    let admin = state.user(&token, true)?;
    if amount_piasters <= 0 { return Err("قيمة سداد السلفة يجب أن تكون أكبر من صفر".into()); }
    let month = valid_period_month(&period_month)?;
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let row = sqlx::query("SELECT amount_piasters FROM employee_loans WHERE id = ?")
        .bind(loan_id).fetch_optional(&mut *tx).await.map_err(db_error)?.ok_or("السلفة غير موجودة")?;
    let original: i64 = row.get("amount_piasters");
    let repaid: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount_piasters), 0) FROM employee_loan_repayments WHERE loan_id = ?")
        .bind(loan_id).fetch_one(&mut *tx).await.map_err(db_error)?;
    if amount_piasters > original - repaid { return Err("قيمة السداد أكبر من المتبقي من السلفة".into()); }
    let id = sqlx::query("INSERT INTO employee_loan_repayments(loan_id, amount_piasters, created_by, period_month) VALUES (?, ?, ?, ?)")
        .bind(loan_id).bind(amount_piasters).bind(admin.user_id).bind(month)
        .execute(&mut *tx).await.map_err(db_error)?.last_insert_rowid();
    sqlx::query("INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'EMPLOYEE_LOAN_REPAYMENT', 'employee_loan_repayments', ?)")
        .bind(admin.user_id).bind(id).execute(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryAuditAdjustmentInput {
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub warehouse_id: i64,
    pub counted_quantity: i64,
}

#[tauri::command]
pub async fn apply_inventory_audit_adjustments(
    state: tauri::State<'_, AppState>,
    token: String,
    adjustments: Vec<InventoryAuditAdjustmentInput>,
) -> Result<usize, String> {
    let user = state.user_with_permission(&token, "inventory_audit")
        .or_else(|_| state.user_with_permission(&token, "products"))?;

    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let mut updated_count = 0;

    for item in adjustments {
        let (balance_id, qty_before): (Option<i64>, i64) = match item.variant_id {
            Some(vid) => {
                let row = sqlx::query("SELECT id, quantity FROM inventory_balances WHERE product_id = ? AND variant_id = ? AND warehouse_id = ?")
                    .bind(item.product_id)
                    .bind(vid)
                    .bind(item.warehouse_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(db_error)?;
                match row {
                    Some(r) => (Some(r.get("id")), r.get("quantity")),
                    None => (None, 0),
                }
            }
            None => {
                let row = sqlx::query("SELECT id, quantity FROM inventory_balances WHERE product_id = ? AND variant_id IS NULL AND warehouse_id = ?")
                    .bind(item.product_id)
                    .bind(item.warehouse_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(db_error)?;
                match row {
                    Some(r) => (Some(r.get("id")), r.get("quantity")),
                    None => (None, 0),
                }
            }
        };

        let diff = item.counted_quantity - qty_before;
        if diff == 0 {
            continue;
        }

        match balance_id {
            Some(bid) => {
                sqlx::query("UPDATE inventory_balances SET quantity = ? WHERE id = ?")
                    .bind(item.counted_quantity)
                    .bind(bid)
                    .execute(&mut *tx)
                    .await
                    .map_err(db_error)?;
            }
            None => {
                sqlx::query("INSERT INTO inventory_balances(product_id, variant_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)")
                    .bind(item.product_id)
                    .bind(item.variant_id)
                    .bind(item.warehouse_id)
                    .bind(item.counted_quantity)
                    .execute(&mut *tx)
                    .await
                    .map_err(db_error)?;
            }
        }

        sqlx::query(
            "INSERT INTO inventory_movements(product_id, variant_id, warehouse_id, change_quantity, quantity_before, quantity_after, movement_type, reference_id, performed_by)
             VALUES (?, ?, ?, ?, ?, ?, 'ADJUSTMENT', NULL, ?)"
        )
        .bind(item.product_id)
        .bind(item.variant_id)
        .bind(item.warehouse_id)
        .bind(diff)
        .bind(qty_before)
        .bind(item.counted_quantity)
        .bind(user.user_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;

        updated_count += 1;
    }

    tx.commit().await.map_err(db_error)?;
    Ok(updated_count)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryAuditReportSummary {
    pub id: i64,
    pub title: String,
    pub month_name: String,
    pub created_at: String,
    pub created_by_name: String,
    pub warehouse_name: String,
    pub category_name: String,
    pub total_products_count: i64,
    pub matched_products_count: i64,
    pub diff_products_count: i64,
    pub total_shortage_units: i64,
    pub total_shortage_cost_piasters: i64,
    pub total_shortage_sell_piasters: i64,
    pub total_surplus_units: i64,
    pub total_surplus_cost_piasters: i64,
    pub total_surplus_sell_piasters: i64,
    pub balances_adjusted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryAuditReportDetails {
    pub id: i64,
    pub title: String,
    pub month_name: String,
    pub created_at: String,
    pub created_by_name: String,
    pub warehouse_name: String,
    pub category_name: String,
    pub total_products_count: i64,
    pub matched_products_count: i64,
    pub diff_products_count: i64,
    pub total_shortage_units: i64,
    pub total_shortage_cost_piasters: i64,
    pub total_shortage_sell_piasters: i64,
    pub total_surplus_units: i64,
    pub total_surplus_cost_piasters: i64,
    pub total_surplus_sell_piasters: i64,
    pub balances_adjusted: bool,
    pub report_data_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveInventoryAuditReportInput {
    pub title: String,
    pub month_name: String,
    pub warehouse_name: String,
    pub category_name: String,
    pub total_products_count: i64,
    pub matched_products_count: i64,
    pub diff_products_count: i64,
    pub total_shortage_units: i64,
    pub total_shortage_cost_piasters: i64,
    pub total_shortage_sell_piasters: i64,
    pub total_surplus_units: i64,
    pub total_surplus_cost_piasters: i64,
    pub total_surplus_sell_piasters: i64,
    pub balances_adjusted: bool,
    pub report_data_json: String,
}

#[tauri::command]
pub async fn list_inventory_audit_reports(
    state: tauri::State<'_, AppState>,
    token: String,
) -> Result<Vec<InventoryAuditReportSummary>, String> {
    state.user_with_permission(&token, "inventory_audit")
        .or_else(|_| state.user_with_permission(&token, "products"))?;

    let rows = sqlx::query(
        "SELECT id, title, month_name, created_at, created_by_name, warehouse_name, category_name,
                total_products_count, matched_products_count, diff_products_count,
                total_shortage_units, total_shortage_cost_piasters, total_shortage_sell_piasters,
                total_surplus_units, total_surplus_cost_piasters, total_surplus_sell_piasters,
                balances_adjusted
         FROM inventory_audit_reports
         ORDER BY id DESC"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let mut list = Vec::new();
    for r in rows {
        let adj_int: i64 = r.get("balances_adjusted");
        list.push(InventoryAuditReportSummary {
            id: r.get("id"),
            title: r.get("title"),
            month_name: r.get("month_name"),
            created_at: r.get("created_at"),
            created_by_name: r.get("created_by_name"),
            warehouse_name: r.get("warehouse_name"),
            category_name: r.get("category_name"),
            total_products_count: r.get("total_products_count"),
            matched_products_count: r.get("matched_products_count"),
            diff_products_count: r.get("diff_products_count"),
            total_shortage_units: r.get("total_shortage_units"),
            total_shortage_cost_piasters: r.get("total_shortage_cost_piasters"),
            total_shortage_sell_piasters: r.get("total_shortage_sell_piasters"),
            total_surplus_units: r.get("total_surplus_units"),
            total_surplus_cost_piasters: r.get("total_surplus_cost_piasters"),
            total_surplus_sell_piasters: r.get("total_surplus_sell_piasters"),
            balances_adjusted: adj_int > 0,
        });
    }
    Ok(list)
}

#[tauri::command]
pub async fn get_inventory_audit_report_details(
    state: tauri::State<'_, AppState>,
    token: String,
    id: i64,
) -> Result<InventoryAuditReportDetails, String> {
    state.user_with_permission(&token, "inventory_audit")
        .or_else(|_| state.user_with_permission(&token, "products"))?;

    let row = sqlx::query(
        "SELECT id, title, month_name, created_at, created_by_name, warehouse_name, category_name,
                total_products_count, matched_products_count, diff_products_count,
                total_shortage_units, total_shortage_cost_piasters, total_shortage_sell_piasters,
                total_surplus_units, total_surplus_cost_piasters, total_surplus_sell_piasters,
                balances_adjusted, report_data_json
         FROM inventory_audit_reports
         WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("تقرير الجرد المطلوب غير موجود")?;

    let adj_int: i64 = row.get("balances_adjusted");
    Ok(InventoryAuditReportDetails {
        id: row.get("id"),
        title: row.get("title"),
        month_name: row.get("month_name"),
        created_at: row.get("created_at"),
        created_by_name: row.get("created_by_name"),
        warehouse_name: row.get("warehouse_name"),
        category_name: row.get("category_name"),
        total_products_count: row.get("total_products_count"),
        matched_products_count: row.get("matched_products_count"),
        diff_products_count: row.get("diff_products_count"),
        total_shortage_units: row.get("total_shortage_units"),
        total_shortage_cost_piasters: row.get("total_shortage_cost_piasters"),
        total_shortage_sell_piasters: row.get("total_shortage_sell_piasters"),
        total_surplus_units: row.get("total_surplus_units"),
        total_surplus_cost_piasters: row.get("total_surplus_cost_piasters"),
        total_surplus_sell_piasters: row.get("total_surplus_sell_piasters"),
        balances_adjusted: adj_int > 0,
        report_data_json: row.get("report_data_json"),
    })
}

#[tauri::command]
pub async fn save_inventory_audit_report(
    state: tauri::State<'_, AppState>,
    token: String,
    report: SaveInventoryAuditReportInput,
) -> Result<i64, String> {
    let user = state.user_with_permission(&token, "inventory_audit")
        .or_else(|_| state.user_with_permission(&token, "products"))?;

    let now_cairo = Utc::now().with_timezone(&Cairo).format("%Y-%m-%d %H:%M:%S").to_string();
    let adj_int = if report.balances_adjusted { 1 } else { 0 };

    let res = sqlx::query(
        "INSERT INTO inventory_audit_reports(
            title, month_name, created_at, created_by_name, warehouse_name, category_name,
            total_products_count, matched_products_count, diff_products_count,
            total_shortage_units, total_shortage_cost_piasters, total_shortage_sell_piasters,
            total_surplus_units, total_surplus_cost_piasters, total_surplus_sell_piasters,
            balances_adjusted, report_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(report.title.trim())
    .bind(report.month_name.trim())
    .bind(now_cairo)
    .bind(&user.full_name)
    .bind(report.warehouse_name.trim())
    .bind(report.category_name.trim())
    .bind(report.total_products_count)
    .bind(report.matched_products_count)
    .bind(report.diff_products_count)
    .bind(report.total_shortage_units)
    .bind(report.total_shortage_cost_piasters)
    .bind(report.total_shortage_sell_piasters)
    .bind(report.total_surplus_units)
    .bind(report.total_surplus_cost_piasters)
    .bind(report.total_surplus_sell_piasters)
    .bind(adj_int)
    .bind(&report.report_data_json)
    .execute(&state.pool)
    .await
    .map_err(db_error)?;

    Ok(res.last_insert_rowid())
}

#[tauri::command]
pub async fn delete_inventory_audit_report(
    state: tauri::State<'_, AppState>,
    token: String,
    id: i64,
) -> Result<(), String> {
    let user = state.user_with_permission(&token, "inventory_audit")?;
    if user.role != "ADMIN" {
        return Err("حذف تقارير الجرد مقتصر على المدير العام فقط".into());
    }
    sqlx::query("DELETE FROM inventory_audit_reports WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub async fn get_inventory_audit_settings(
    state: tauri::State<'_, AppState>,
    token: String,
) -> Result<bool, String> {
    state.user_with_permission(&token, "inventory_audit")
        .or_else(|_| state.user_with_permission(&token, "products"))?;

    let val: Option<i64> = sqlx::query_scalar(
        "SELECT show_system_qty_during_audit FROM inventory_audit_settings WHERE id = 1"
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?;

    Ok(val.unwrap_or(0) > 0)
}

#[tauri::command]
pub async fn save_inventory_audit_settings(
    state: tauri::State<'_, AppState>,
    token: String,
    show_system_qty_during_audit: bool,
) -> Result<(), String> {
    let user = state.user_with_permission(&token, "inventory_audit")?;
    if user.role != "ADMIN" {
        return Err("تعديل إعدادات عرض كميات الجرد مقتصر على المدير العام فقط".into());
    }

    let val = if show_system_qty_during_audit { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO inventory_audit_settings(id, show_system_qty_during_audit)
         VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET show_system_qty_during_audit = excluded.show_system_qty_during_audit"
    )
    .bind(val)
    .execute(&state.pool)
    .await
    .map_err(db_error)?;

    Ok(())
}

#[tauri::command]
pub async fn mark_inventory_audit_report_adjusted(
    state: tauri::State<'_, AppState>,
    token: String,
    id: i64,
) -> Result<(), String> {
    let user = state.user_with_permission(&token, "inventory_audit")?;
    if user.role != "ADMIN" {
        return Err("اعتماد وتعديل حالة أرصدة التقرير مقتصر على المدير العام فقط".into());
    }
    sqlx::query("UPDATE inventory_audit_reports SET balances_adjusted = 1 WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(db_error)?;
    Ok(())
}

// -----------------------------------------------------------------------------
// Online Sales & Orders (Dedicated Online Channel with Deferred Confirmation)
// -----------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineOrderLineInput {
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub warehouse_id: i64,
    pub quantity: i64,
    pub sell_price_piasters: Option<i64>,
    pub discount_each_piasters: i64,
    pub name_override: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineOrderInput {
    pub customer_name: String,
    pub customer_phone: String,
    pub customer_address: Option<String>,
    pub shipping_fee_piasters: i64,
    pub deposit_piasters: Option<i64>,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub seller_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub lines: Vec<OnlineOrderLineInput>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineOrderView {
    pub id: i64,
    pub order_number: i64,
    pub customer_name: String,
    pub customer_phone: String,
    pub customer_address: Option<String>,
    pub shipping_fee_piasters: i64,
    pub deposit_piasters: i64,
    pub subtotal_piasters: i64,
    pub discount_piasters: i64,
    pub total_piasters: i64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub status: String,
    pub invoice_id: Option<i64>,
    pub invoice_number: Option<i64>,
    pub created_by_name: String,
    pub seller_name: String,
    pub confirmed_by_name: Option<String>,
    pub confirmed_at: Option<String>,
    pub created_at: String,
    pub items_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineOrderItemView {
    pub id: i64,
    pub product_id: i64,
    pub variant_id: Option<i64>,
    pub warehouse_id: i64,
    pub warehouse_name: String,
    pub name_snapshot: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub sell_price_piasters: i64,
    pub discount_each_piasters: i64,
    pub quantity: i64,
    pub line_total_piasters: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnlineOrderDetail {
    pub order: OnlineOrderView,
    pub items: Vec<OnlineOrderItemView>,
}

#[tauri::command]
pub async fn create_online_order(
    state: tauri::State<'_, AppState>,
    token: String,
    input: OnlineOrderInput,
) -> Result<i64, String> {
    let user = state.user(&token, false)?;
    if input.lines.is_empty() {
        return Err("أضف منتجًا واحدًا على الأقل للطلب".into());
    }
    let cust_name = clean_name(&input.customer_name)?;
    let cust_phone = clean_customer_phone(&input.customer_phone)?;
    if input.shipping_fee_piasters < 0 {
        return Err("مصاريف الشحن لا يمكن أن تكون سالبة".into());
    }

    let mut tx = state.pool.begin().await.map_err(db_error)?;
    let mut subtotal = 0_i64;
    let mut discount = 0_i64;
    let mut resolved_lines = Vec::new();

    for line in &input.lines {
        if line.quantity <= 0 || line.discount_each_piasters < 0 {
            return Err("الكمية أو الخصم غير صحيح".into());
        }
        let row = sqlx::query(
            "SELECT b.id AS balance_id, b.quantity AS stock, p.name, p.buy_price_piasters, p.sell_price_piasters
             FROM inventory_balances b JOIN products p ON p.id = b.product_id
             WHERE b.product_id = ? AND b.variant_id IS ? AND b.warehouse_id = ? AND p.is_active = 1",
        )
        .bind(line.product_id)
        .bind(line.variant_id)
        .bind(line.warehouse_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or("المنتج أو المتغير غير موجود في المخزن")?;

        let price = line.sell_price_piasters.unwrap_or_else(|| row.get("sell_price_piasters"));
        if price < 0 || line.discount_each_piasters > price {
            return Err("سعر البيع أو الخصم غير صحيح".into());
        }
        let name = match &line.name_override {
            Some(value) => clean_name(value)?.to_owned(),
            None => row.get("name"),
        };
        let line_total = (price - line.discount_each_piasters)
            .checked_mul(line.quantity)
            .ok_or("قيمة الصنف كبيرة جدًا")?;

        subtotal = subtotal
            .checked_add(price.checked_mul(line.quantity).ok_or("قيمة الطلب كبيرة جدًا")?)
            .ok_or("قيمة الطلب كبيرة جدًا")?;
        discount = discount
            .checked_add(line.discount_each_piasters.checked_mul(line.quantity).ok_or("قيمة الخصم كبيرة جدًا")?)
            .ok_or("قيمة الخصم كبيرة جدًا")?;

        resolved_lines.push((
            line.product_id,
            line.variant_id,
            line.warehouse_id,
            name,
            row.get::<i64, _>("buy_price_piasters"),
            price,
            line.discount_each_piasters,
            line.quantity,
            line_total,
        ));
    }

    let items_total = subtotal - discount;
    let total = items_total
        .checked_add(input.shipping_fee_piasters)
        .ok_or("إجمالي الطلب كبير جدًا")?;

    let (seller_id, employee_id) = match input.employee_id {
        Some(emp_id) if emp_id > 0 => {
            let u_id: Option<i64> = sqlx::query_scalar("SELECT user_id FROM employees WHERE id = ?")
                .bind(emp_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(db_error)?
                .flatten();
            (u_id.unwrap_or(user.user_id), Some(emp_id))
        }
        _ => match input.seller_id {
            Some(id) if id > 0 => {
                let emp_id: Option<i64> = sqlx::query_scalar("SELECT id FROM employees WHERE user_id = ?")
                    .bind(id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(db_error)?;
                (id, emp_id)
            }
            _ => {
                let emp_id: Option<i64> = sqlx::query_scalar("SELECT id FROM employees WHERE user_id = ?")
                    .bind(user.user_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(db_error)?;
                (user.user_id, emp_id)
            }
        },
    };

    let order_number = sqlx::query("INSERT INTO online_order_sequence DEFAULT VALUES")
        .execute(&mut *tx)
        .await
        .map_err(db_error)?
        .last_insert_rowid();

    let payment_method = input.payment_method.as_deref().unwrap_or("CASH_ON_DELIVERY");

    // Ensure customer is saved or updated in customers table
    let existing_customer_id = sqlx::query_scalar::<_, i64>(
        "SELECT id FROM customers WHERE phone = ?"
    )
    .bind(&cust_phone)
    .fetch_optional(&mut *tx)
    .await
    .map_err(db_error)?;

    if let Some(c_id) = existing_customer_id {
        let _ = sqlx::query("UPDATE customers SET name = ? WHERE id = ?")
            .bind(cust_name)
            .bind(c_id)
            .execute(&mut *tx)
            .await;
    } else {
        let new_id = sqlx::query("INSERT INTO customers(name, phone) VALUES (?, ?)")
            .bind(cust_name)
            .bind(&cust_phone)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?
            .last_insert_rowid();
        let _ = sqlx::query(
            "INSERT INTO audit_logs(user_id, action, entity_type, entity_id) VALUES (?, 'CUSTOMER_CREATE', 'customers', ?)"
        )
        .bind(user.user_id)
        .bind(new_id)
        .execute(&mut *tx)
        .await;
    }

    let deposit_piasters = input.deposit_piasters.unwrap_or(0);
    if deposit_piasters < 0 || deposit_piasters > total {
        return Err("مبلغ العربون غير صحيح أو أكبر من إجمالي الطلب".into());
    }

    let order_id = sqlx::query(
        "INSERT INTO online_orders(
            order_number, customer_name, customer_phone, customer_address,
            shipping_fee_piasters, deposit_piasters, subtotal_piasters, discount_piasters, total_piasters,
            payment_method, notes, status, created_by, seller_id, employee_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)"
    )
    .bind(order_number)
    .bind(cust_name)
    .bind(&cust_phone)
    .bind(input.customer_address.as_deref().map(str::trim))
    .bind(input.shipping_fee_piasters)
    .bind(deposit_piasters)
    .bind(subtotal)
    .bind(discount)
    .bind(total)
    .bind(payment_method)
    .bind(input.notes.as_deref().map(str::trim))
    .bind(user.user_id)
    .bind(seller_id)
    .bind(employee_id)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?
    .last_insert_rowid();

    for (p_id, v_id, w_id, name, buy_price, sell_price, disc, qty, line_tot) in resolved_lines {
        sqlx::query(
            "INSERT INTO online_order_items(
                order_id, product_id, variant_id, warehouse_id, name_snapshot,
                buy_price_piasters, sell_price_piasters, discount_each_piasters, quantity, line_total_piasters
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(order_id)
        .bind(p_id)
        .bind(v_id)
        .bind(w_id)
        .bind(name)
        .bind(buy_price)
        .bind(sell_price)
        .bind(disc)
        .bind(qty)
        .bind(line_tot)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    }

    tx.commit().await.map_err(db_error)?;
    Ok(order_number)
}

#[tauri::command]
pub async fn list_online_orders(
    state: tauri::State<'_, AppState>,
    token: String,
    status_filter: Option<String>,
) -> Result<Vec<OnlineOrderView>, String> {
    let _user = state.user(&token, false)?;
    let mut sql = String::from(
        "SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_address,
                o.shipping_fee_piasters, COALESCE(o.deposit_piasters, 0) AS deposit_piasters,
                o.subtotal_piasters, o.discount_piasters, o.total_piasters,
                o.payment_method, o.notes, o.status, o.invoice_id,
                inv.invoice_number,
                u_creator.full_name AS created_by_name,
                COALESCE(emp.name, u_seller.full_name) AS seller_name,
                u_confirmer.full_name AS confirmed_by_name,
                o.confirmed_at, o.created_at,
                (SELECT COUNT(*) FROM online_order_items WHERE order_id = o.id) AS items_count
         FROM online_orders o
         JOIN users u_creator ON u_creator.id = o.created_by
         JOIN users u_seller ON u_seller.id = o.seller_id
         LEFT JOIN employees emp ON emp.id = o.employee_id
         LEFT JOIN users u_confirmer ON u_confirmer.id = o.confirmed_by
         LEFT JOIN invoices inv ON inv.id = o.invoice_id "
    );

    if let Some(ref s) = status_filter {
        if s != "ALL" && !s.is_empty() {
            sql.push_str(" WHERE o.status = '");
            sql.push_str(s);
            sql.push_str("' ");
        }
    }
    sql.push_str(" ORDER BY o.id DESC");

    let rows = sqlx::query(&sql)
        .fetch_all(&state.pool)
        .await
        .map_err(db_error)?;

    Ok(rows.iter().map(|r| OnlineOrderView {
        id: r.get("id"),
        order_number: r.get("order_number"),
        customer_name: r.get("customer_name"),
        customer_phone: r.get("customer_phone"),
        customer_address: r.get("customer_address"),
        shipping_fee_piasters: r.get("shipping_fee_piasters"),
        deposit_piasters: r.get("deposit_piasters"),
        subtotal_piasters: r.get("subtotal_piasters"),
        discount_piasters: r.get("discount_piasters"),
        total_piasters: r.get("total_piasters"),
        payment_method: r.get("payment_method"),
        notes: r.get("notes"),
        status: r.get("status"),
        invoice_id: r.get("invoice_id"),
        invoice_number: r.get("invoice_number"),
        created_by_name: r.get("created_by_name"),
        seller_name: r.get("seller_name"),
        confirmed_by_name: r.get("confirmed_by_name"),
        confirmed_at: r.get("confirmed_at"),
        created_at: r.get("created_at"),
        items_count: r.get("items_count"),
    }).collect())
}

#[tauri::command]
pub async fn get_online_order_details(
    state: tauri::State<'_, AppState>,
    token: String,
    order_id: i64,
) -> Result<OnlineOrderDetail, String> {
    let _user = state.user(&token, false)?;
    let r = sqlx::query(
        "SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_address,
                o.shipping_fee_piasters, COALESCE(o.deposit_piasters, 0) AS deposit_piasters,
                o.subtotal_piasters, o.discount_piasters, o.total_piasters,
                o.payment_method, o.notes, o.status, o.invoice_id,
                inv.invoice_number,
                u_creator.full_name AS created_by_name,
                COALESCE(emp.name, u_seller.full_name) AS seller_name,
                u_confirmer.full_name AS confirmed_by_name,
                o.confirmed_at, o.created_at,
                (SELECT COUNT(*) FROM online_order_items WHERE order_id = o.id) AS items_count
         FROM online_orders o
         JOIN users u_creator ON u_creator.id = o.created_by
         JOIN users u_seller ON u_seller.id = o.seller_id
         LEFT JOIN employees emp ON emp.id = o.employee_id
         LEFT JOIN users u_confirmer ON u_confirmer.id = o.confirmed_by
         LEFT JOIN invoices inv ON inv.id = o.invoice_id
         WHERE o.id = ?"
    )
    .bind(order_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(db_error)?
    .ok_or("الطلب غير موجود")?;

    let order = OnlineOrderView {
        id: r.get("id"),
        order_number: r.get("order_number"),
        customer_name: r.get("customer_name"),
        customer_phone: r.get("customer_phone"),
        customer_address: r.get("customer_address"),
        shipping_fee_piasters: r.get("shipping_fee_piasters"),
        deposit_piasters: r.get("deposit_piasters"),
        subtotal_piasters: r.get("subtotal_piasters"),
        discount_piasters: r.get("discount_piasters"),
        total_piasters: r.get("total_piasters"),
        payment_method: r.get("payment_method"),
        notes: r.get("notes"),
        status: r.get("status"),
        invoice_id: r.get("invoice_id"),
        invoice_number: r.get("invoice_number"),
        created_by_name: r.get("created_by_name"),
        seller_name: r.get("seller_name"),
        confirmed_by_name: r.get("confirmed_by_name"),
        confirmed_at: r.get("confirmed_at"),
        created_at: r.get("created_at"),
        items_count: r.get("items_count"),
    };

    let item_rows = sqlx::query(
        "SELECT oi.id, oi.product_id, oi.variant_id, oi.warehouse_id,
                w.name AS warehouse_name,
                oi.name_snapshot,
                v.color, v.size,
                oi.sell_price_piasters, oi.discount_each_piasters,
                oi.quantity, oi.line_total_piasters
         FROM online_order_items oi
         JOIN warehouses w ON w.id = oi.warehouse_id
         LEFT JOIN product_variants v ON v.id = oi.variant_id
         WHERE oi.order_id = ?
         ORDER BY oi.id ASC"
    )
    .bind(order_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?;

    let items = item_rows.iter().map(|ir| OnlineOrderItemView {
        id: ir.get("id"),
        product_id: ir.get("product_id"),
        variant_id: ir.get("variant_id"),
        warehouse_id: ir.get("warehouse_id"),
        warehouse_name: ir.get("warehouse_name"),
        name_snapshot: ir.get("name_snapshot"),
        color: ir.get("color"),
        size: ir.get("size"),
        sell_price_piasters: ir.get("sell_price_piasters"),
        discount_each_piasters: ir.get("discount_each_piasters"),
        quantity: ir.get("quantity"),
        line_total_piasters: ir.get("line_total_piasters"),
    }).collect();

    Ok(OnlineOrderDetail { order, items })
}

#[tauri::command]
pub async fn confirm_online_order(
    state: tauri::State<'_, AppState>,
    token: String,
    order_id: i64,
) -> Result<i64, String> {
    // Only ADMIN can confirm dispatch of online order
    let admin = state.user(&token, true)?;

    let mut tx = state.pool.begin().await.map_err(db_error)?;

    let order = sqlx::query(
        "SELECT id, order_number, customer_name, customer_phone, customer_address,
                shipping_fee_piasters, subtotal_piasters, discount_piasters, total_piasters,
                payment_method, notes, status, seller_id, employee_id
         FROM online_orders WHERE id = ?"
    )
    .bind(order_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(db_error)?
    .ok_or("الطلب غير موجود")?;

    let status: String = order.get("status");
    if status != "PENDING" {
        return Err("لا يمكن تأكيد هذا الطلب؛ حالته ليست قيد الانتظار".into());
    }

    let items = sqlx::query(
        "SELECT id, product_id, variant_id, warehouse_id, name_snapshot,
                buy_price_piasters, sell_price_piasters, discount_each_piasters, quantity, line_total_piasters
         FROM online_order_items WHERE order_id = ?"
    )
    .bind(order_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(db_error)?;

    if items.is_empty() {
        return Err("الطلب لا يحتوي على منتجات".into());
    }

    // 1. Verify stock availability for each item and decrement inventory
    for item in &items {
        let p_id: i64 = item.get("product_id");
        let v_id: Option<i64> = item.get("variant_id");
        let w_id: i64 = item.get("warehouse_id");
        let qty: i64 = item.get("quantity");
        let name: String = item.get("name_snapshot");

        let bal_row = sqlx::query(
            "SELECT id, quantity FROM inventory_balances
             WHERE product_id = ? AND variant_id IS ? AND warehouse_id = ?"
        )
        .bind(p_id).bind(v_id).bind(w_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(db_error)?
        .ok_or_else(|| format!("المنتج غير موجود في رصيد المخزن: {}", name))?;

        let bal_id: i64 = bal_row.get("id");
        let current_stock: i64 = bal_row.get("quantity");

        if current_stock < qty {
            return Err(format!(
                "الكمية المتاحة في المخزن ({}) أقل من الكمية المطلوبة ({}) للمنتج: {}",
                current_stock, qty, name
            ));
        }

        // Deduct inventory
        let updated = sqlx::query(
            "UPDATE inventory_balances SET quantity = quantity - ? WHERE id = ? AND quantity >= ?"
        )
        .bind(qty).bind(bal_id).bind(qty)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;

        if updated.rows_affected() != 1 {
            return Err(format!("تغير رصيد المخزن للمنتج {}. أعد المحاولة", name));
        }

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements(
                product_id, variant_id, warehouse_id, change_quantity,
                quantity_before, quantity_after, movement_type, reference_id, performed_by
             ) VALUES (?, ?, ?, ?, ?, ?, 'SALE', ?, ?)"
        )
        .bind(p_id)
        .bind(v_id)
        .bind(w_id)
        .bind(-qty)
        .bind(current_stock)
        .bind(current_stock - qty)
        .bind(order_id)
        .bind(admin.user_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    }

    // 2. Ensure customer exists in customers table
    let cust_name: String = order.get("customer_name");
    let cust_phone: String = order.get("customer_phone");
    let customer_id: i64 = if let Some(existing) = sqlx::query_scalar::<_, i64>(
        "SELECT id FROM customers WHERE phone = ?"
    )
    .bind(&cust_phone)
    .fetch_optional(&mut *tx)
    .await
    .map_err(db_error)? {
        existing
    } else {
        sqlx::query("INSERT INTO customers(name, phone) VALUES (?, ?)")
            .bind(&cust_name)
            .bind(&cust_phone)
            .execute(&mut *tx)
            .await
            .map_err(db_error)?
            .last_insert_rowid()
    };

    // 3. Create the official invoice in invoices table
    let inv_number = sqlx::query("INSERT INTO invoice_sequence DEFAULT VALUES")
        .execute(&mut *tx)
        .await
        .map_err(db_error)?
        .last_insert_rowid();

    let subtotal: i64 = order.get("subtotal_piasters");
    let discount: i64 = order.get("discount_piasters");
    let shipping: i64 = order.get("shipping_fee_piasters");
    let total: i64 = order.get("total_piasters");
    let seller_id: i64 = order.get("seller_id");
    let employee_id: Option<i64> = order.get("employee_id");
    let payment_method: String = order.get("payment_method");
    let user_notes: Option<String> = order.get("notes");
    let order_num: i64 = order.get("order_number");
    let deposit: i64 = order.try_get("deposit_piasters").unwrap_or(0);

    let combined_notes = if deposit > 0 {
        format!(
            "طلب أونلاين #{} (عربون: {:.2} ج.م - عند الاستلام: {:.2} ج.م){}",
            order_num,
            deposit as f64 / 100.0,
            (total - deposit).max(0) as f64 / 100.0,
            user_notes.as_deref().map(|n| format!(" - {}", n)).unwrap_or_default()
        )
    } else {
        format!(
            "طلب أونلاين #{}{}",
            order_num,
            user_notes.as_deref().map(|n| format!(" - {}", n)).unwrap_or_default()
        )
    };

    // If shipping fee is present, add it to subtotal so subtotal - discount = total
    let effective_subtotal = subtotal + shipping;

    // Paid distribution based on payment method
    let (paid_cash, paid_instapay, paid_wallet) = match payment_method.as_str() {
        "INSTAPAY" => (0, total, 0),
        "WALLET" => (0, 0, total),
        _ => (total, 0, 0), // CASH_ON_DELIVERY or CASH
    };

    let invoice_id = sqlx::query(
        "INSERT INTO invoices(
            invoice_number, customer_id, seller_id, employee_id, created_by,
            subtotal_piasters, discount_piasters, total_piasters,
            paid_cash_piasters, paid_instapay_piasters, paid_wallet_piasters, remaining_piasters,
            notes, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'COMPLETED')"
    )
    .bind(inv_number)
    .bind(customer_id)
    .bind(seller_id)
    .bind(employee_id)
    .bind(admin.user_id)
    .bind(effective_subtotal)
    .bind(discount)
    .bind(total)
    .bind(paid_cash)
    .bind(paid_instapay)
    .bind(paid_wallet)
    .bind(&combined_notes)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?
    .last_insert_rowid();

    // 4. Copy items to invoice_items
    for item in items {
        let p_id: i64 = item.get("product_id");
        let v_id: Option<i64> = item.get("variant_id");
        let w_id: i64 = item.get("warehouse_id");
        let name: String = item.get("name_snapshot");
        let buy_price: i64 = item.get("buy_price_piasters");
        let sell_price: i64 = item.get("sell_price_piasters");
        let disc: i64 = item.get("discount_each_piasters");
        let qty: i64 = item.get("quantity");
        let line_tot: i64 = item.get("line_total_piasters");

        sqlx::query(
            "INSERT INTO invoice_items(
                invoice_id, product_id, variant_id, warehouse_id, name_snapshot,
                buy_price_piasters, sell_price_piasters, discount_each_piasters, quantity, line_total_piasters
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(invoice_id)
        .bind(p_id)
        .bind(v_id)
        .bind(w_id)
        .bind(name)
        .bind(buy_price)
        .bind(sell_price)
        .bind(disc)
        .bind(qty)
        .bind(line_tot)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    }

    // 5. Update online_orders status to CONFIRMED
    sqlx::query(
        "UPDATE online_orders
         SET status = 'CONFIRMED',
             invoice_id = ?,
             confirmed_by = ?,
             confirmed_at = datetime('now', 'localtime')
         WHERE id = ?"
    )
    .bind(invoice_id)
    .bind(admin.user_id)
    .bind(order_id)
    .execute(&mut *tx)
    .await
    .map_err(db_error)?;

    tx.commit().await.map_err(db_error)?;
    Ok(inv_number)
}

#[tauri::command]
pub async fn cancel_online_order(
    state: tauri::State<'_, AppState>,
    token: String,
    order_id: i64,
) -> Result<(), String> {
    let _user = state.user(&token, false)?;
    let row = sqlx::query("SELECT status FROM online_orders WHERE id = ?")
        .bind(order_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(db_error)?
        .ok_or("الطلب غير موجود")?;

    let status: String = row.get("status");
    if status != "PENDING" {
        return Err("لا يمكن إلغاء هذا الطلب؛ يمكن فقط إلغاء الطلبات قيد الانتظار".into());
    }

    sqlx::query("UPDATE online_orders SET status = 'CANCELLED' WHERE id = ?")
        .bind(order_id)
        .execute(&state.pool)
        .await
        .map_err(db_error)?;

    Ok(())
}

// ==================== BACKUP & RESTORE SYSTEM ====================

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupItem {
    pub file_name: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub created_at: String,
    pub backup_type: String,
    pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupOverview {
    pub backups: Vec<BackupItem>,
    pub backup_dir: String,
    pub database_path: String,
    pub database_size_bytes: u64,
    pub database_size_formatted: String,
    pub total_backups_size_bytes: u64,
    pub total_backups_size_formatted: String,
    pub last_backup_time: Option<String>,
    pub auto_backup_enabled: bool,
    pub auto_backup_time: String,
    pub auto_backup_retention: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct BackupManifestEntry {
    note: Option<String>,
    backup_type: String,
    created_at: String,
    created_by: Option<String>,
}

fn format_file_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.0} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn load_backup_manifest(backup_dir: &std::path::Path) -> HashMap<String, BackupManifestEntry> {
    let manifest_path = backup_dir.join("manifest.json");
    if let Ok(data) = std::fs::read_to_string(&manifest_path) {
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

fn update_backup_manifest(backup_dir: &std::path::Path, file_name: &str, entry: BackupManifestEntry) {
    let manifest_path = backup_dir.join("manifest.json");
    let mut manifest = load_backup_manifest(backup_dir);
    manifest.insert(file_name.to_string(), entry);
    if let Ok(serialized) = serde_json::to_string_pretty(&manifest) {
        let _ = std::fs::write(&manifest_path, serialized);
    }
}

fn remove_from_manifest(backup_dir: &std::path::Path, file_name: &str) {
    let manifest_path = backup_dir.join("manifest.json");
    let mut manifest = load_backup_manifest(backup_dir);
    if manifest.remove(file_name).is_some() {
        if let Ok(serialized) = serde_json::to_string_pretty(&manifest) {
            let _ = std::fs::write(&manifest_path, serialized);
        }
    }
}

fn cleanup_old_auto_backups(backup_dir: &std::path::Path, max_retention: i64) {
    if max_retention <= 0 { return; }
    let mut auto_files: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(backup_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with("auto-daily-") && (name.ends_with(".sqlite") || name.ends_with(".db")) {
                        auto_files.push(name.to_string());
                    }
                }
            }
        }
    }
    auto_files.sort_by(|a, b| b.cmp(a));
    let limit = max_retention as usize;
    if auto_files.len() > limit {
        for old_file in &auto_files[limit..] {
            let p = backup_dir.join(old_file);
            let _ = std::fs::remove_file(&p);
            remove_from_manifest(backup_dir, old_file);
        }
    }
}

async fn run_auto_backup_scheduler(pool: SqlitePool, data_dir: std::path::PathBuf) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;

        let settings = match sqlx::query(
            "SELECT auto_backup_enabled, auto_backup_time, auto_backup_retention, last_auto_backup_date FROM backup_settings WHERE id = 1"
        ).fetch_optional(&pool).await {
            Ok(Some(row)) => row,
            _ => continue,
        };

        let enabled: i64 = settings.get("auto_backup_enabled");
        if enabled <= 0 { continue; }

        let target_time_str: String = settings.get("auto_backup_time");
        let last_date: Option<String> = settings.get("last_auto_backup_date");
        let retention: i64 = settings.get("auto_backup_retention");

        let now_cairo = Utc::now().with_timezone(&Cairo);
        let today_str = now_cairo.format("%Y-%m-%d").to_string();

        if last_date.as_deref() == Some(&today_str) {
            continue;
        }

        let target_time = match NaiveTime::parse_from_str(&target_time_str, "%H:%M") {
            Ok(t) => t,
            Err(_) => continue,
        };

        let current_time = now_cairo.time();
        if current_time >= target_time {
            let backup_dir = data_dir.join("backups");
            if let Err(e) = std::fs::create_dir_all(&backup_dir) {
                eprintln!("Auto backup dir error: {e}");
                continue;
            }

            let file_name = format!("auto-daily-{today_str}.sqlite");
            let backup_path = backup_dir.join(&file_name);
            let backup_path_str = backup_path.to_string_lossy().into_owned();

            match sqlx::query("VACUUM INTO ?").bind(&backup_path_str).execute(&pool).await {
                Ok(_) => {
                    let _ = sqlx::query("UPDATE backup_settings SET last_auto_backup_date = ? WHERE id = 1")
                        .bind(&today_str)
                        .execute(&pool)
                        .await;

                    update_backup_manifest(&backup_dir, &file_name, BackupManifestEntry {
                        note: Some("نسخة تلقائية يومية مجدولة".into()),
                        backup_type: "AUTO".into(),
                        created_at: now_cairo.format("%Y-%m-%d %H:%M:%S").to_string(),
                        created_by: Some("النظام التلقائي".into()),
                    });

                    cleanup_old_auto_backups(&backup_dir, retention);
                }
                Err(err) => {
                    eprintln!("Auto backup failed: {err}");
                }
            }
        }
    }
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let input = input.trim();
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0;
    for &b in input.as_bytes() {
        let val = match b {
            b'A'..=b'Z' => (b - b'A') as u32,
            b'a'..=b'z' => (b - b'a' + 26) as u32,
            b'0'..=b'9' => (b - b'0' + 52) as u32,
            b'+' => 62,
            b'/' => 63,
            b'=' | b'\r' | b'\n' | b' ' => continue,
            _ => return Err("حرف Base64 غير صالح".into()),
        };
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(out)
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);
        out.push(TABLE[(b0 >> 2) as usize] as char);
        out.push(TABLE[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(b2 & 63) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

#[tauri::command]
pub async fn get_backup_overview(
    state: tauri::State<'_, AppState>,
    token: String,
) -> Result<BackupOverview, String> {
    state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("تعذر قراءة مجلد النسخ: {e}"))?;

    let live_db = state.data_dir.join("cashier.sqlite");
    let database_size_bytes = std::fs::metadata(&live_db).map(|m| m.len()).unwrap_or(0);
    let database_size_formatted = format_file_size(database_size_bytes);

    let manifest = load_backup_manifest(&backup_dir);

    let mut backups = Vec::new();
    let mut total_backups_size_bytes = 0u64;
    let mut last_backup_time: Option<String> = None;

    if let Ok(entries) = std::fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() { continue; }
            let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
            if !name.ends_with(".sqlite") && !name.ends_with(".db") { continue; }

            let meta = std::fs::metadata(&path).ok();
            let size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            total_backups_size_bytes += size_bytes;

            let (b_type, created_at, note) = if let Some(m) = manifest.get(&name) {
                (m.backup_type.clone(), m.created_at.clone(), m.note.clone())
            } else {
                let inferred_type = if name.starts_with("manual-") {
                    "MANUAL"
                } else if name.starts_with("auto-") {
                    "AUTO"
                } else if name.starts_with("safety-") {
                    "SAFETY"
                } else if name.starts_with("before-v") {
                    "MIGRATION"
                } else if name.starts_with("imported-") {
                    "IMPORTED"
                } else {
                    "CUSTOM"
                };

                let c_time = meta.and_then(|m| m.modified().ok())
                    .map(|st| {
                        let dt: DateTime<Utc> = st.into();
                        dt.with_timezone(&Cairo).format("%Y-%m-%d %H:%M:%S").to_string()
                    })
                    .unwrap_or_else(|| "—".into());

                (inferred_type.to_string(), c_time, None)
            };

            backups.push(BackupItem {
                file_name: name,
                file_path: path.to_string_lossy().into_owned(),
                size_bytes,
                size_formatted: format_file_size(size_bytes),
                created_at,
                backup_type: b_type,
                note,
            });
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at).then_with(|| b.file_name.cmp(&a.file_name)));

    if let Some(first) = backups.first() {
        last_backup_time = Some(first.created_at.clone());
    }

    let (enabled, time_str, retention) = if let Ok(row) = sqlx::query(
        "SELECT auto_backup_enabled, auto_backup_time, auto_backup_retention FROM backup_settings WHERE id = 1"
    ).fetch_optional(&state.pool).await {
        if let Some(r) = row {
            let en: i64 = r.get("auto_backup_enabled");
            let tm: String = r.get("auto_backup_time");
            let rt: i64 = r.get("auto_backup_retention");
            (en > 0, tm, rt)
        } else {
            (true, "23:30".into(), 30)
        }
    } else {
        (true, "23:30".into(), 30)
    };

    Ok(BackupOverview {
        backups,
        backup_dir: backup_dir.to_string_lossy().into_owned(),
        database_path: live_db.to_string_lossy().into_owned(),
        database_size_bytes,
        database_size_formatted,
        total_backups_size_bytes,
        total_backups_size_formatted: format_file_size(total_backups_size_bytes),
        last_backup_time,
        auto_backup_enabled: enabled,
        auto_backup_time: time_str,
        auto_backup_retention: retention,
    })
}

#[tauri::command]
pub async fn create_backup(
    state: tauri::State<'_, AppState>,
    token: String,
    note: Option<String>,
) -> Result<BackupItem, String> {
    let user = state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("تعذر إنشاء مجلد النسخ: {e}"))?;

    let now_cairo = Utc::now().with_timezone(&Cairo);
    let time_tag = now_cairo.format("%Y-%m-%d_%H-%M-%S").to_string();
    let file_name = format!("manual-{time_tag}.sqlite");
    let backup_path = backup_dir.join(&file_name);

    let backup_path_str = backup_path.to_string_lossy().into_owned();
    sqlx::query("VACUUM INTO ?")
        .bind(&backup_path_str)
        .execute(&state.pool)
        .await
        .map_err(|e| format!("فشل إنشاء النسخة الاحتياطية: {e}"))?;

    let size_bytes = std::fs::metadata(&backup_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let size_formatted = format_file_size(size_bytes);
    let created_at = now_cairo.format("%Y-%m-%d %H:%M:%S").to_string();

    let clean_note = note.and_then(|n| {
        let t = n.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });

    update_backup_manifest(&backup_dir, &file_name, BackupManifestEntry {
        note: clean_note.clone(),
        backup_type: "MANUAL".to_string(),
        created_at: created_at.clone(),
        created_by: Some(user.full_name),
    });

    Ok(BackupItem {
        file_name,
        file_path: backup_path_str,
        size_bytes,
        size_formatted,
        created_at,
        backup_type: "MANUAL".into(),
        note: clean_note,
    })
}

#[tauri::command]
pub async fn restore_backup(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    token: String,
    file_name: String,
) -> Result<String, String> {
    let user = state.user(&token, true)?;

    let backup_dir = state.data_dir.join("backups");
    let target_file = backup_dir.join(&file_name);
    if !target_file.exists() || !target_file.is_file() {
        return Err("ملف النسخة الاحتياطية غير موجود".into());
    }

    let mut header = [0u8; 16];
    let mut f = std::fs::File::open(&target_file).map_err(|e| format!("تعذر قراءة ملف النسخة: {e}"))?;
    use std::io::Read;
    f.read_exact(&mut header).map_err(|e| format!("ملف تالف أو غير صالح: {e}"))?;
    if &header != b"SQLite format 3\0" {
        return Err("الملف المحدد ليس قاعدة بيانات SQLite صالحة".into());
    }
    drop(f);

    // 1. Safety snapshot of current database
    let now_cairo = Utc::now().with_timezone(&Cairo);
    let safety_name = format!("safety-before-restore-{}.sqlite", now_cairo.format("%Y-%m-%d_%H-%M-%S"));
    let safety_path = backup_dir.join(&safety_name);
    let safety_path_str = safety_path.to_string_lossy().into_owned();
    let _ = sqlx::query("VACUUM INTO ?")
        .bind(&safety_path_str)
        .execute(&state.pool)
        .await;

    update_backup_manifest(&backup_dir, &safety_name, BackupManifestEntry {
        note: Some(format!("لقطة أمان تلقائية قبل استعادة {}", file_name)),
        backup_type: "SAFETY".into(),
        created_at: now_cairo.format("%Y-%m-%d %H:%M:%S").to_string(),
        created_by: Some(user.full_name),
    });

    // 2. Checkpoint and close pool
    let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE);").execute(&state.pool).await;
    state.pool.close().await;

    tokio::time::sleep(std::time::Duration::from_millis(250)).await;

    // 3. Overwrite database
    let live_db = state.data_dir.join("cashier.sqlite");
    std::fs::copy(&target_file, &live_db)
        .map_err(|e| format!("تعذر استبدال قاعدة البيانات: {e}"))?;

    let wal = state.data_dir.join("cashier.sqlite-wal");
    let shm = state.data_dir.join("cashier.sqlite-shm");
    let _ = std::fs::remove_file(wal);
    let _ = std::fs::remove_file(shm);

    // 4. Restart application cleanly after sending success response
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(600)).await;
        app.restart();
    });

    Ok("تمت استعادة النسخة الاحتياطية بنجاح! جاري إعادة تشغيل البرنامج الآن...".into())
}

#[tauri::command]
pub async fn import_external_backup(
    state: tauri::State<'_, AppState>,
    token: String,
    file_name: String,
    file_bytes_base64: String,
    note: Option<String>,
) -> Result<BackupItem, String> {
    let user = state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("تعذر إنشاء مجلد النسخ: {e}"))?;

    let raw_bytes = decode_base64(&file_bytes_base64)
        .map_err(|_| "تعذر فك تشفير محتوى الملف المرفوع")?;

    if raw_bytes.len() < 16 || &raw_bytes[0..16] != b"SQLite format 3\0" {
        return Err("الملف المرفوع ليس قاعدة بيانات SQLite صالحة".into());
    }

    let now_cairo = Utc::now().with_timezone(&Cairo);
    let time_tag = now_cairo.format("%Y-%m-%d_%H-%M-%S").to_string();
    let sanitized_orig = file_name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
    let new_filename = format!("imported-{time_tag}-{sanitized_orig}");
    let save_path = backup_dir.join(&new_filename);

    std::fs::write(&save_path, &raw_bytes)
        .map_err(|e| format!("تعذر حفظ ملف النسخة: {e}"))?;

    let size_bytes = raw_bytes.len() as u64;
    let size_formatted = format_file_size(size_bytes);
    let created_at = now_cairo.format("%Y-%m-%d %H:%M:%S").to_string();

    let clean_note = note.and_then(|n| {
        let t = n.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    }).or_else(|| Some(format!("مستورد من: {file_name}")));

    update_backup_manifest(&backup_dir, &new_filename, BackupManifestEntry {
        note: clean_note.clone(),
        backup_type: "IMPORTED".to_string(),
        created_at: created_at.clone(),
        created_by: Some(user.full_name),
    });

    Ok(BackupItem {
        file_name: new_filename,
        file_path: save_path.to_string_lossy().into_owned(),
        size_bytes,
        size_formatted,
        created_at,
        backup_type: "IMPORTED".into(),
        note: clean_note,
    })
}

#[tauri::command]
pub async fn export_backup_file(
    state: tauri::State<'_, AppState>,
    token: String,
    file_name: String,
) -> Result<String, String> {
    state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    let target_file = backup_dir.join(&file_name);
    if !target_file.exists() || !target_file.is_file() {
        return Err("ملف النسخة الاحتياطية غير موجود".into());
    }
    let bytes = std::fs::read(&target_file)
        .map_err(|e| format!("تعذر قراءة ملف النسخة: {e}"))?;
    Ok(encode_base64(&bytes))
}

#[tauri::command]
pub async fn delete_backup(
    state: tauri::State<'_, AppState>,
    token: String,
    file_name: String,
) -> Result<String, String> {
    state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    let target_file = backup_dir.join(&file_name);
    if !target_file.exists() || !target_file.is_file() {
        return Err("ملف النسخة الاحتياطية غير موجود".into());
    }
    std::fs::remove_file(&target_file).map_err(|e| format!("تعذر حذف الملف: {e}"))?;
    remove_from_manifest(&backup_dir, &file_name);
    Ok("تم حذف النسخة الاحتياطية بنجاح".into())
}

#[tauri::command]
pub async fn save_backup_settings(
    state: tauri::State<'_, AppState>,
    token: String,
    auto_backup_enabled: bool,
    auto_backup_time: String,
    auto_backup_retention: i64,
) -> Result<String, String> {
    state.user(&token, true)?;
    let enabled_int = if auto_backup_enabled { 1 } else { 0 };
    let retention = if auto_backup_retention < 1 { 30 } else { auto_backup_retention };
    sqlx::query(
        "UPDATE backup_settings SET auto_backup_enabled = ?, auto_backup_time = ?, auto_backup_retention = ? WHERE id = 1"
    )
    .bind(enabled_int)
    .bind(&auto_backup_time)
    .bind(retention)
    .execute(&state.pool)
    .await
    .map_err(db_error)?;

    Ok("تم حفظ إعدادات النسخ الاحتياطي بنجاح".into())
}

#[tauri::command]
pub async fn open_backups_directory(
    state: tauri::State<'_, AppState>,
    token: String,
) -> Result<String, String> {
    state.user(&token, true)?;
    let backup_dir = state.data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("تعذر إنشاء المجلد: {e}"))?;
    let path_str = backup_dir.to_string_lossy().into_owned();

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(&path_str).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&path_str).spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&path_str).spawn();
    }

    Ok(path_str)
}

#[cfg(test)]
mod staff_workflow_tests {
    use super::*;
    use chrono::{NaiveDate, NaiveTime, TimeZone};
    use chrono_tz::Africa::Cairo;

    #[test]
    fn overnight_shift_uses_previous_workday_after_midnight() {
        let now = Cairo.with_ymd_and_hms(2026, 1, 2, 2, 0, 0).single().unwrap();
        let start = NaiveTime::from_hms_opt(22, 0, 0).unwrap();
        let end = NaiveTime::from_hms_opt(6, 0, 0).unwrap();
        assert_eq!(attendance_shift_date(&now, start, end), NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());
    }

    #[test]
    fn late_duration_keeps_hours_minutes_and_seconds() {
        assert_eq!(format_late_duration(3837), "1 ساعة و3 دقيقة و57 ثانية");
        assert_eq!(format_late_duration(59), "59 ثانية");
    }

    #[test]
    fn month_validation_rejects_invalid_and_multibyte_input() {
        assert!(valid_period_month("2026-09").is_ok());
        assert!(valid_period_month("2026-13").is_err());
        assert!(valid_period_month("٢٠٢٦-09").is_err());
    }

    #[test]
    fn migration_runs_cleanly_with_existing_data() {
        tauri::async_runtime::block_on(async {
            use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
            let temp_dir = std::env::temp_dir();
            let db_path = temp_dir.join(format!("test_morsi_{}.sqlite", uuid::Uuid::new_v4()));

            let migration_options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true)
                .foreign_keys(false);
            let migration_pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(migration_options)
                .await
                .unwrap();

            super::MIGRATOR.run(&migration_pool).await.unwrap();
            migration_pool.close().await;

            let options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true)
                .foreign_keys(true);
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(options)
                .await
                .unwrap();
            sqlx::query("PRAGMA foreign_key_check;").execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO employees(name, job_title, work_hours, hire_date, base_salary_piasters, shift_start, shift_end) VALUES ('Worker', 'Cashier', 8, '2026-01-01', 500000, '09:00', '17:00')")
                .execute(&pool).await.unwrap();
            sqlx::query("PRAGMA foreign_key_check;").execute(&pool).await.unwrap();
            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }

    #[test]
    fn test_online_orders_lifecycle() {
        tauri::async_runtime::block_on(async {
            use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
            use sqlx::Row;
            let temp_dir = std::env::temp_dir();
            let db_path = temp_dir.join(format!("test_online_{}.sqlite", uuid::Uuid::new_v4()));

            let migration_options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true)
                .foreign_keys(false);
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(migration_options)
                .await
                .unwrap();

            super::MIGRATOR.run(&pool).await.unwrap();

            // Seed user, category, warehouse, product, balance
            sqlx::query("INSERT INTO users(username, full_name, password_hash, role) VALUES ('admin', 'Admin User', 'hash', 'ADMIN')")
                .execute(&pool).await.unwrap();
            let user_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = 'admin'").fetch_one(&pool).await.unwrap();

            sqlx::query("INSERT INTO categories(name) VALUES ('Belts')").execute(&pool).await.unwrap();
            let cat_id: i64 = sqlx::query_scalar("SELECT id FROM categories LIMIT 1").fetch_one(&pool).await.unwrap();

            sqlx::query("INSERT INTO warehouses(name) VALUES ('Main Warehouse')").execute(&pool).await.unwrap();
            let wh_id: i64 = sqlx::query_scalar("SELECT id FROM warehouses LIMIT 1").fetch_one(&pool).await.unwrap();

            sqlx::query("INSERT INTO products(name, barcode, category_id, buy_price_piasters, sell_price_piasters, low_stock_threshold) VALUES ('Belt Leather', '123456789', ?, 5000, 10000, 2)")
                .bind(cat_id).execute(&pool).await.unwrap();
            let prod_id: i64 = sqlx::query_scalar("SELECT id FROM products LIMIT 1").fetch_one(&pool).await.unwrap();

            sqlx::query("INSERT INTO inventory_balances(product_id, warehouse_id, quantity) VALUES (?, ?, 10)")
                .bind(prod_id).bind(wh_id).execute(&pool).await.unwrap();

            // Verify initial state: stock = 10, invoices = 0
            let initial_stock: i64 = sqlx::query_scalar("SELECT quantity FROM inventory_balances WHERE product_id = ?").bind(prod_id).fetch_one(&pool).await.unwrap();
            assert_eq!(initial_stock, 10);
            let initial_invoices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices").fetch_one(&pool).await.unwrap();
            assert_eq!(initial_invoices, 0);

            // Create online order sequence and order
            let ord_num: i64 = sqlx::query("INSERT INTO online_order_sequence DEFAULT VALUES").execute(&pool).await.unwrap().last_insert_rowid();
            let order_id: i64 = sqlx::query(
                "INSERT INTO online_orders(order_number, customer_name, customer_phone, customer_address, shipping_fee_piasters, subtotal_piasters, discount_piasters, total_piasters, payment_method, status, created_by, seller_id)
                 VALUES (?, 'Test Customer', '01011112222', 'Cairo, Egypt', 5000, 20000, 0, 25000, 'CASH_ON_DELIVERY', 'PENDING', ?, ?)"
            )
            .bind(ord_num).bind(user_id).bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            sqlx::query(
                "INSERT INTO online_order_items(order_id, product_id, warehouse_id, name_snapshot, buy_price_piasters, sell_price_piasters, discount_each_piasters, quantity, line_total_piasters)
                 VALUES (?, ?, ?, 'Belt Leather', 5000, 10000, 0, 2, 20000)"
            )
            .bind(order_id).bind(prod_id).bind(wh_id).execute(&pool).await.unwrap();

            // While PENDING, verify stock is STILL 10, invoices is STILL 0
            let pending_stock: i64 = sqlx::query_scalar("SELECT quantity FROM inventory_balances WHERE product_id = ?").bind(prod_id).fetch_one(&pool).await.unwrap();
            assert_eq!(pending_stock, 10);
            let pending_invoices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices").fetch_one(&pool).await.unwrap();
            assert_eq!(pending_invoices, 0);

            // Confirm order: simulate deduction and invoice creation
            sqlx::query("UPDATE inventory_balances SET quantity = quantity - 2 WHERE product_id = ? AND warehouse_id = ?")
                .bind(prod_id).bind(wh_id).execute(&pool).await.unwrap();

            let inv_seq: i64 = sqlx::query("INSERT INTO invoice_sequence DEFAULT VALUES").execute(&pool).await.unwrap().last_insert_rowid();
            let inv_id: i64 = sqlx::query(
                "INSERT INTO invoices(invoice_number, customer_id, seller_id, created_by, subtotal_piasters, discount_piasters, total_piasters, paid_cash_piasters, paid_instapay_piasters, paid_wallet_piasters, remaining_piasters, notes, status)
                 VALUES (?, 1, ?, ?, 25000, 0, 25000, 25000, 0, 0, 0, 'Online Order Confirmation', 'COMPLETED')"
            )
            .bind(inv_seq).bind(user_id).bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            sqlx::query("UPDATE online_orders SET status = 'CONFIRMED', invoice_id = ?, confirmed_by = ?, confirmed_at = datetime('now') WHERE id = ?")
                .bind(inv_id).bind(user_id).bind(order_id).execute(&pool).await.unwrap();

            // After CONFIRMED: stock must be 8, invoices must be 1
            let confirmed_stock: i64 = sqlx::query_scalar("SELECT quantity FROM inventory_balances WHERE product_id = ?").bind(prod_id).fetch_one(&pool).await.unwrap();
            assert_eq!(confirmed_stock, 8);
            let confirmed_invoices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices WHERE status = 'COMPLETED'").fetch_one(&pool).await.unwrap();
            assert_eq!(confirmed_invoices, 1);

            let ord_row = sqlx::query("SELECT status, invoice_id FROM online_orders WHERE id = ?").bind(order_id).fetch_one(&pool).await.unwrap();
            assert_eq!(ord_row.get::<String, _>("status"), "CONFIRMED");
            assert_eq!(ord_row.get::<i64, _>("invoice_id"), inv_id);

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }

    #[test]
    fn test_delete_and_recreate_employee_with_same_username_and_name() {
        tauri::async_runtime::block_on(async {
            use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
            let temp_dir = std::env::temp_dir();
            let db_path = temp_dir.join(format!("test_emp_{}.sqlite", uuid::Uuid::new_v4()));

            let migration_options = SqliteConnectOptions::new()
                .filename(&db_path)
                .create_if_missing(true)
                .foreign_keys(false);
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(migration_options)
                .await
                .unwrap();

            super::MIGRATOR.run(&pool).await.unwrap();

            // 1. Insert admin user
            sqlx::query("INSERT INTO users(username, full_name, password_hash, role) VALUES ('admin', 'Admin', 'hash', 'ADMIN')")
                .execute(&pool).await.unwrap();

            // 2. Insert employee "test" with username "test"
            let user_id: i64 = sqlx::query("INSERT INTO users(username, password_hash, full_name, role) VALUES ('test', 'hash123', 'test', 'SELLER')")
                .execute(&pool).await.unwrap().last_insert_rowid();

            let emp_id: i64 = sqlx::query(
                "INSERT INTO employees(user_id, name, job_title, work_hours, hire_date, base_salary_piasters, shift_start, shift_end)
                 VALUES (?, 'test', 'بائع', 8, '2026-09-18', 0, '09:00', '17:00')"
            )
            .bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            // Verify both are active
            let emp_active: i64 = sqlx::query_scalar("SELECT is_active FROM employees WHERE id = ?").bind(emp_id).fetch_one(&pool).await.unwrap();
            assert_eq!(emp_active, 1);

            // 3. Delete the employee: user's username gets renamed with _deleted_<id> and marked inactive
            sqlx::query("UPDATE users SET username = username || '_deleted_' || id, is_active = 0 WHERE id = ?")
                .bind(user_id).execute(&pool).await.unwrap();
            sqlx::query("UPDATE employees SET is_active = 0 WHERE id = ?")
                .bind(emp_id).execute(&pool).await.unwrap();

            // Verify old user is renamed and inactive
            let old_username: String = sqlx::query_scalar("SELECT username FROM users WHERE id = ?").bind(user_id).fetch_one(&pool).await.unwrap();
            assert_eq!(old_username, format!("test_deleted_{}", user_id));

            // 4. Re-create employee with same name "test" and same username "test"
            // Ensure defensive query frees up any lingering inactive user with the same username
            sqlx::query("UPDATE users SET username = username || '_deleted_' || id WHERE username = 'test' AND is_active = 0")
                .execute(&pool).await.unwrap();

            let new_user_id: i64 = sqlx::query("INSERT INTO users(username, password_hash, full_name, role) VALUES ('test', 'newhash123', 'test', 'SELLER')")
                .execute(&pool).await.unwrap().last_insert_rowid();
            assert_ne!(new_user_id, user_id);

            let new_emp_id: i64 = sqlx::query(
                "INSERT INTO employees(user_id, name, job_title, work_hours, hire_date, base_salary_piasters, shift_start, shift_end)
                 VALUES (?, 'test', 'بائع', 8, '2026-09-18', 0, '09:00', '17:00')"
            )
            .bind(new_user_id).execute(&pool).await.unwrap().last_insert_rowid();
            assert_ne!(new_emp_id, emp_id);

            // Verify new employee and user are active and have username "test"
            let active_user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE username = 'test' AND is_active = 1").fetch_one(&pool).await.unwrap();
            assert_eq!(active_user_count, 1);

            let active_emp_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE name = 'test' AND is_active = 1").fetch_one(&pool).await.unwrap();
            assert_eq!(active_emp_count, 1);

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }

    #[test]
    fn test_telegram_auto_report_settings_and_daily_report_query() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db_path = format!("/tmp/test_morsi_telegram_auto_{}.db", Uuid::new_v4());
            let pool = SqlitePoolOptions::new()
                .connect(&format!("sqlite://{}?mode=rwc", db_path))
                .await
                .unwrap();
            MIGRATOR.run(&pool).await.unwrap();

            // 1. Verify telegram_settings has default auto_report columns
            let row = sqlx::query("SELECT auto_report_enabled, auto_report_time, auto_report_last_sent_date FROM telegram_settings WHERE id = 1")
                .fetch_one(&pool).await.unwrap();
            let enabled: i64 = row.get("auto_report_enabled");
            let time_str: String = row.get("auto_report_time");
            assert_eq!(enabled, 0);
            assert_eq!(time_str, "23:00");

            // 2. Update settings to enable auto report at 22:30
            sqlx::query("UPDATE telegram_settings SET auto_report_enabled = 1, auto_report_time = '22:30' WHERE id = 1")
                .execute(&pool).await.unwrap();

            let row2 = sqlx::query("SELECT auto_report_enabled, auto_report_time FROM telegram_settings WHERE id = 1")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(row2.get::<i64, _>("auto_report_enabled"), 1);
            assert_eq!(row2.get::<String, _>("auto_report_time"), "22:30");

            // 3. Test debt_row query from customer_payments to ensure 'method' column works without error
            let today = Utc::now().with_timezone(&Cairo).date_naive().format("%Y-%m-%d").to_string();
            let debt_row = sqlx::query(
                "SELECT
                    COUNT(*) AS cnt,
                    COALESCE(SUM(amount_piasters), 0) AS total_debt,
                    COALESCE(SUM(CASE WHEN method = 'CASH' THEN amount_piasters ELSE 0 END), 0) AS debt_cash,
                    COALESCE(SUM(CASE WHEN method = 'INSTAPAY' THEN amount_piasters ELSE 0 END), 0) AS debt_instapay,
                    COALESCE(SUM(CASE WHEN method = 'WALLET' THEN amount_piasters ELSE 0 END), 0) AS debt_wallet
                 FROM customer_payments
                 WHERE date(created_at, 'localtime') = ?"
            )
            .bind(&today)
            .fetch_one(&pool)
            .await;

            assert!(debt_row.is_ok(), "Querying customer_payments with 'method' column failed: {:?}", debt_row.err());

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }

    #[test]
    fn test_backup_settings_and_vacuum_backup() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_id = Uuid::new_v4();
            let db_path = format!("/tmp/test_morsi_backup_{}.db", temp_id);
            let backup_path = format!("/tmp/test_morsi_backup_target_{}.db", temp_id);
            let pool = SqlitePoolOptions::new()
                .connect(&format!("sqlite://{}?mode=rwc", db_path))
                .await
                .unwrap();
            MIGRATOR.run(&pool).await.unwrap();

            // 1. Verify backup_settings default values
            let row = sqlx::query("SELECT auto_backup_enabled, auto_backup_time, auto_backup_retention FROM backup_settings WHERE id = 1")
                .fetch_one(&pool).await.unwrap();
            let enabled: i64 = row.get("auto_backup_enabled");
            let time_str: String = row.get("auto_backup_time");
            let retention: i64 = row.get("auto_backup_retention");
            assert_eq!(enabled, 1);
            assert_eq!(time_str, "23:30");
            assert_eq!(retention, 30);

            // 2. Test VACUUM INTO creates valid backup file
            sqlx::query("VACUUM INTO ?").bind(&backup_path).execute(&pool).await.unwrap();
            assert!(std::path::Path::new(&backup_path).exists());

            // 3. Verify backup file header
            let mut f = std::fs::File::open(&backup_path).unwrap();
            let mut header = [0u8; 16];
            use std::io::Read;
            f.read_exact(&mut header).unwrap();
            assert_eq!(&header, b"SQLite format 3\0");
            drop(f);

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
            let _ = std::fs::remove_file(backup_path);
        });
    }

    #[test]
    fn test_employee_rewards_and_financial_balance() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_id = Uuid::new_v4();
            let db_path = format!("/tmp/test_morsi_rewards_{}.db", temp_id);
            let pool = SqlitePoolOptions::new()
                .connect(&format!("sqlite://{}?mode=rwc", db_path))
                .await
                .unwrap();
            MIGRATOR.run(&pool).await.unwrap();

            // 1. Insert user & employee
            let user_id: i64 = sqlx::query("INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin_test', 'hash', 'Admin', 'ADMIN')")
                .execute(&pool).await.unwrap().last_insert_rowid();
            let emp_id: i64 = sqlx::query(
                "INSERT INTO employees(user_id, name, job_title, work_hours, hire_date, base_salary_piasters, shift_start, shift_end)
                 VALUES (?, 'أحمد كمال', 'بائع', 8, '2026-09-01', 500000, '09:00', '17:00')"
            ).bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            // 2. Insert reward
            let reward_id: i64 = sqlx::query(
                "INSERT INTO employee_rewards(employee_id, amount_piasters, reason, created_by, period_month)
                 VALUES (?, 50000, 'حافز مبيعات ممتاز', ?, '2026-09')"
            ).bind(emp_id).bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            // 3. Insert deduction
            let deduction_id: i64 = sqlx::query(
                "INSERT INTO employee_deductions(employee_id, amount_piasters, reason, created_by, period_month)
                 VALUES (?, 20000, 'تأخير', ?, '2026-09')"
            ).bind(emp_id).bind(user_id).execute(&pool).await.unwrap().last_insert_rowid();

            // 4. Verify totals
            let total_rewards: i64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(amount_piasters), 0) FROM employee_rewards WHERE employee_id = ? AND period_month = '2026-09'"
            ).bind(emp_id).fetch_one(&pool).await.unwrap();
            assert_eq!(total_rewards, 50000);

            let total_deductions: i64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(amount_piasters), 0) FROM employee_deductions WHERE employee_id = ? AND period_month = '2026-09'"
            ).bind(emp_id).fetch_one(&pool).await.unwrap();
            assert_eq!(total_deductions, 20000);

            let base_salary: i64 = 500000;
            let net = base_salary + total_rewards - total_deductions;
            assert_eq!(net, 530000);

            // 5. Test deletion
            sqlx::query("DELETE FROM employee_rewards WHERE id = ?").bind(reward_id).execute(&pool).await.unwrap();
            let rewards_after: i64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(amount_piasters), 0) FROM employee_rewards WHERE employee_id = ? AND period_month = '2026-09'"
            ).bind(emp_id).fetch_one(&pool).await.unwrap();
            assert_eq!(rewards_after, 0);

            sqlx::query("DELETE FROM employee_deductions WHERE id = ?").bind(deduction_id).execute(&pool).await.unwrap();
            let deductions_after: i64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(amount_piasters), 0) FROM employee_deductions WHERE employee_id = ? AND period_month = '2026-09'"
            ).bind(emp_id).fetch_one(&pool).await.unwrap();
            assert_eq!(deductions_after, 0);

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }

    #[test]
    fn test_list_login_users() {
        tauri::async_runtime::block_on(async {
            let db_path = format!("/tmp/test_morsi_login_users_{}.db", uuid::Uuid::new_v4());
            let pool = SqlitePoolOptions::new()
                .connect(&format!("sqlite://{}?mode=rwc", db_path))
                .await
                .unwrap();
            MIGRATOR.run(&pool).await.unwrap();

            let _admin_id: i64 = sqlx::query("INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin_root', 'hash1', 'المدير العام', 'ADMIN')")
                .execute(&pool).await.unwrap().last_insert_rowid();

            let seller_id: i64 = sqlx::query("INSERT INTO users(username, password_hash, full_name, role, permissions) VALUES ('seller1', 'hash2', 'أحمد البائع', 'SELLER', '[\"pos\",\"invoices\",\"main_cashier\"]')")
                .execute(&pool).await.unwrap().last_insert_rowid();

            sqlx::query(
                "INSERT INTO employees(user_id, name, job_title, work_hours, hire_date, base_salary_piasters, shift_start, shift_end)
                 VALUES (?, 'أحمد البائع', 'مسؤول مبيعات', 8, '2026-09-01', 500000, '09:00', '17:00')"
            ).bind(seller_id).execute(&pool).await.unwrap();

            // Inactive user should not appear
            sqlx::query("INSERT INTO users(username, password_hash, full_name, role, is_active) VALUES ('inactive_user', 'hash3', 'معطل', 'SELLER', 0)")
                .execute(&pool).await.unwrap();

            let rows = sqlx::query(
                "SELECT u.username, u.full_name, u.role, u.permissions, emp.name AS emp_name, emp.job_title
                 FROM users u
                 LEFT JOIN employees emp ON emp.user_id = u.id AND emp.is_active = 1
                 WHERE u.is_active = 1
                 ORDER BY CASE WHEN u.role = 'ADMIN' THEN 0 ELSE 1 END, COALESCE(emp.name, u.full_name) ASC"
            )
            .fetch_all(&pool)
            .await
            .unwrap();

            assert_eq!(rows.len(), 2);
            let u0: String = rows[0].get("username");
            assert_eq!(u0, "admin_root");
            let u1: String = rows[1].get("username");
            assert_eq!(u1, "seller1");

            pool.close().await;
            let _ = std::fs::remove_file(db_path);
        });
    }
}
