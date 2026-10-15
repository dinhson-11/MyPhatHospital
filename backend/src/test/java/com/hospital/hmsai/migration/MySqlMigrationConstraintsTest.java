package com.hospital.hmsai.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm thử migration Flyway V1→V23 và các ràng buộc toàn vẹn trên MySQL 8 THẬT (Testcontainers).
 * Test H2 của dự án tắt Flyway nên không bao giờ chạy các migration này; ở đây chạy thật,
 * gồm cả trường hợp nâng cấp một CSDL đã có dữ liệu bẩn (hóa đơn/cấp phát trùng, tồn kho âm…).
 * Tự bỏ qua khi máy không có Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
class MySqlMigrationConstraintsTest {

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("hmsai_it")
            .withUsername("it_user")
            .withPassword("it_pass");

    private Connection conn;

    @BeforeEach
    void freshSchema() throws SQLException {
        // Mỗi test một schema riêng để độc lập với nhau
        String schema = "it_" + System.nanoTime();
        try (Connection root = DriverManager.getConnection(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword());
             Statement st = root.createStatement()) {
            st.execute("CREATE DATABASE " + schema + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            st.execute("GRANT ALL ON " + schema + ".* TO 'it_user'@'%'");
        }
        conn = DriverManager.getConnection(MYSQL.getJdbcUrl().replace("/hmsai_it", "/" + schema),
                MYSQL.getUsername(), MYSQL.getPassword());
        this.schema = schema;
    }

    private String schema;

    private Flyway flyway(String target) {
        return Flyway.configure()
                .dataSource(MYSQL.getJdbcUrl().replace("/hmsai_it", "/" + schema), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load();
    }

    private void exec(String sql) throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.execute(sql);
        }
    }

    private long count(String sql) throws SQLException {
        try (Statement st = conn.createStatement(); var rs = st.executeQuery(sql)) {
            rs.next();
            return rs.getLong(1);
        }
    }

    /** Chèn một ca khám tối thiểu, trả về id. */
    private long insertVisit(String patientCode) throws SQLException {
        exec("INSERT INTO patients(patient_code, full_name) VALUES ('" + patientCode + "', 'BN " + patientCode + "')");
        long patientId = count("SELECT id FROM patients WHERE patient_code = '" + patientCode + "'");
        long doctorId = count("SELECT MIN(id) FROM staff_profiles");
        exec("INSERT INTO visits(doctor_id, patient_id) VALUES (" + doctorId + ", " + patientId + ")");
        return count("SELECT MAX(id) FROM visits");
    }

    @Test
    @DisplayName("Toàn bộ migration V1→V24 chạy được trên MySQL 8")
    void allMigrationsApplyOnMySql8() {
        var result = flyway("latest").migrate();
        assertEquals(24, result.migrationsExecuted);
        assertEquals("24", result.targetSchemaVersion);
    }

    @Test
    @DisplayName("V24: users có cột ảnh đại diện; tài khoản có sẵn chưa có ảnh (hiển thị chữ cái đầu tên)")
    void userAvatarColumnsAdded() throws Exception {
        flyway("latest").migrate();
        long users = count("SELECT COUNT(*) FROM users");
        assertTrue(users > 0);
        assertEquals(users, count("SELECT COUNT(*) FROM users WHERE avatar_url IS NULL AND avatar_public_id IS NULL"));

        String longUrl = "https://res.cloudinary.com/x/image/upload/f_auto,q_auto/v1/" + "a".repeat(400);
        exec("UPDATE users SET avatar_url = '" + longUrl + "', avatar_public_id = 'myphat-hospital/avatars/user-1-abc' WHERE username = 'admin'");
        assertEquals(1, count("SELECT COUNT(*) FROM users WHERE avatar_url = '" + longUrl + "'"));
    }

    @Test
    @DisplayName("V22: tài khoản Kế toán được chuyển sang vai trò Lễ tân - Kế toán, vai trò ACCOUNTANT bị xóa")
    void accountantRoleIsMergedIntoReceptionist() throws Exception {
        flyway("21").migrate();
        assertEquals(1, count("SELECT COUNT(*) FROM roles WHERE code = 'ACCOUNTANT'"));
        // Một tài khoản chỉ có role ACCOUNTANT, một tài khoản có cả hai role (không được vi phạm khóa chính)
        exec("INSERT INTO users(username, password_hash, full_name, status) VALUES ('kt_only', 'x', 'KT Only', 'ACTIVE')");
        exec("INSERT INTO users(username, password_hash, full_name, status) VALUES ('kt_both', 'x', 'KT Both', 'ACTIVE')");
        exec("INSERT INTO user_roles(user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'kt_only' AND r.code = 'ACCOUNTANT'");
        exec("INSERT INTO user_roles(user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.username IN ('kt_both') AND r.code IN ('ACCOUNTANT', 'RECEPTIONIST')");

        flyway("latest").migrate();

        assertEquals(0, count("SELECT COUNT(*) FROM roles WHERE code = 'ACCOUNTANT'"));
        assertEquals(1, count("SELECT COUNT(*) FROM roles WHERE code = 'RECEPTIONIST' AND name = 'Lễ tân - Kế toán'"));
        for (String username : new String[]{"kt_only", "kt_both", "ketoan", "letan"}) {
            assertEquals(1, count("SELECT COUNT(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id "
                    + "JOIN roles r ON r.id = ur.role_id WHERE u.username = '" + username + "' AND r.code = 'RECEPTIONIST'"),
                    username + " phải có đúng 1 role RECEPTIONIST");
            assertEquals(1, count("SELECT COUNT(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id "
                    + "WHERE u.username = '" + username + "'"), username + " không còn role nào khác");
        }
    }

    @Test
    @DisplayName("V23: tài khoản mẫu bs.maianh (Bác sĩ) và ds.quang (Dược sĩ) tồn tại, có hồ sơ nhân viên và lịch trực")
    void demoDoctorAndPharmacistExist() throws Exception {
        flyway("latest").migrate();
        assertEquals(1, count("SELECT COUNT(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id "
                + "WHERE u.username = 'bs.maianh' AND r.code = 'DOCTOR'"));
        assertEquals(1, count("SELECT COUNT(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id "
                + "WHERE u.username = 'ds.quang' AND r.code = 'PHARMACIST'"));
        assertEquals(2, count("SELECT COUNT(*) FROM staff_profiles sp JOIN users u ON u.id = sp.user_id "
                + "WHERE u.username IN ('bs.maianh', 'ds.quang')"));
        assertEquals(true, count("SELECT COUNT(*) FROM staff_schedules ss JOIN staff_profiles sp ON sp.id = ss.staff_id "
                + "JOIN users u ON u.id = sp.user_id WHERE u.username IN ('bs.maianh', 'ds.quang')") > 0);
        // Tài khoản mẫu benhnhan có hồ sơ bệnh nhân liên kết (để /patients/me và lịch hẹn của tôi dùng được)
        assertEquals(1, count("SELECT COUNT(*) FROM patients p JOIN users u ON u.id = p.user_id WHERE u.username = 'benhnhan'"));
        // Không còn tài khoản mẫu cũ trùng người
        assertEquals(0, count("SELECT COUNT(*) FROM users WHERE username IN ('bacsi', 'duocsi')"));
    }

    @Test
    @DisplayName("Ràng buộc: hai hóa đơn PENDING cùng ca khám bị từ chối; hóa đơn đã hủy không chiếm chỗ")
    void duplicateActiveInvoicePerVisitIsRejected() throws Exception {
        flyway("latest").migrate();
        long visit = insertVisit("BN-IT-1");
        long patient = count("SELECT patient_id FROM visits WHERE id = " + visit);

        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status, invoice_code) VALUES ("
                + patient + ", " + visit + ", 1000, 'PENDING', 'HD-IT-1')");
        assertThrows(SQLException.class, () -> exec(
                "INSERT INTO invoices(patient_id, visit_id, total_amount, status, invoice_code) VALUES ("
                        + patient + ", " + visit + ", 1000, 'PENDING', 'HD-IT-2')"));

        exec("UPDATE invoices SET status = 'CANCELLED' WHERE invoice_code = 'HD-IT-1'");
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status, invoice_code) VALUES ("
                + patient + ", " + visit + ", 1000, 'PENDING', 'HD-IT-3')");
        assertEquals(2, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + visit));
    }

    @Test
    @DisplayName("Ràng buộc: mã giao dịch ngân hàng không được dùng cho hai hóa đơn")
    void duplicateTransactionCodeIsRejected() throws Exception {
        flyway("latest").migrate();
        long v1 = insertVisit("BN-IT-2");
        long v2 = insertVisit("BN-IT-3");
        long p1 = count("SELECT patient_id FROM visits WHERE id = " + v1);
        long p2 = count("SELECT patient_id FROM visits WHERE id = " + v2);
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status, invoice_code, transaction_code) VALUES ("
                + p1 + ", " + v1 + ", 1000, 'PAID', 'HD-IT-4', 'FT123')");
        assertThrows(SQLException.class, () -> exec(
                "INSERT INTO invoices(patient_id, visit_id, total_amount, status, invoice_code, transaction_code) VALUES ("
                        + p2 + ", " + v2 + ", 1000, 'PAID', 'HD-IT-5', 'FT123')"));
    }

    @Test
    @DisplayName("Ràng buộc: cấp phát hai lần cùng một đơn thuốc và tồn kho âm đều bị từ chối")
    void doubleDispenseAndNegativeStockAreRejected() throws Exception {
        flyway("latest").migrate();
        long visit = insertVisit("BN-IT-4");
        exec("INSERT INTO prescriptions(visit_id) VALUES (" + visit + ")");
        long rx = count("SELECT MAX(id) FROM prescriptions");
        long by = count("SELECT MIN(id) FROM staff_profiles");

        exec("INSERT INTO dispenses(dispensed_by, prescription_id) VALUES (" + by + ", " + rx + ")");
        assertThrows(SQLException.class,
                () -> exec("INSERT INTO dispenses(dispensed_by, prescription_id) VALUES (" + by + ", " + rx + ")"));

        assertThrows(SQLException.class,
                () -> exec("INSERT INTO drugs(code, name, stock_quantity) VALUES ('IT-NEG', 'Âm', -1)"));
        exec("INSERT INTO drugs(code, name, stock_quantity) VALUES ('IT-ZERO', 'Hết', 0)");
        assertThrows(SQLException.class, () -> exec("UPDATE drugs SET stock_quantity = stock_quantity - 1 WHERE code = 'IT-ZERO'"));
    }

    @Test
    @DisplayName("Ràng buộc: một lịch hẹn chỉ gắn với một lượt khám")
    void oneVisitPerAppointment() throws Exception {
        flyway("latest").migrate();
        long visit = insertVisit("BN-IT-5");
        long patient = count("SELECT patient_id FROM visits WHERE id = " + visit);
        long doctor = count("SELECT doctor_id FROM visits WHERE id = " + visit);
        exec("INSERT INTO appointments(doctor_id, patient_id, scheduled_at) VALUES (" + doctor + ", " + patient + ", '2026-10-01 08:00:00')");
        long appt = count("SELECT MAX(id) FROM appointments");
        exec("UPDATE visits SET appointment_id = " + appt + " WHERE id = " + visit);
        assertThrows(SQLException.class, () -> exec(
                "INSERT INTO visits(doctor_id, patient_id, appointment_id) VALUES (" + doctor + ", " + patient + ", " + appt + ")"));
    }

    @Test
    @DisplayName("Nâng cấp CSDL cũ có dữ liệu bẩn: V20/V21 dọn trùng/âm mà không mất bản ghi tiền, rồi áp được ràng buộc")
    void upgradeOfDirtyDatabaseCleansDuplicates() throws Exception {
        flyway("19").migrate();

        long doctor = count("SELECT MIN(id) FROM staff_profiles");
        exec("INSERT INTO patients(patient_code, full_name) VALUES ('BN-D-1', 'A'), ('BN-D-2', 'B')");
        long p1 = count("SELECT id FROM patients WHERE patient_code = 'BN-D-1'");
        long p2 = count("SELECT id FROM patients WHERE patient_code = 'BN-D-2'");

        // Một lịch hẹn – hai lượt khám
        exec("INSERT INTO appointments(doctor_id, patient_id, scheduled_at) VALUES (" + doctor + ", " + p1 + ", '2026-10-01 08:00:00')");
        long appt = count("SELECT MAX(id) FROM appointments");
        exec("INSERT INTO visits(doctor_id, patient_id, appointment_id) VALUES (" + doctor + ", " + p1 + ", " + appt + ")");
        long vA = count("SELECT MAX(id) FROM visits");
        exec("INSERT INTO visits(doctor_id, patient_id, appointment_id) VALUES (" + doctor + ", " + p1 + ", " + appt + ")");
        exec("INSERT INTO visits(doctor_id, patient_id) VALUES (" + doctor + ", " + p2 + ")");
        long vB = count("SELECT MAX(id) FROM visits");
        exec("INSERT INTO visits(doctor_id, patient_id) VALUES (" + doctor + ", " + p2 + ")");
        long vC = count("SELECT MAX(id) FROM visits");

        // Hóa đơn: PENDING+PENDING (vA); PAID cũ + PENDING mới (vB); PAID+PAID (vC)
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status) VALUES (" + p1 + ", " + vA + ", 100000, 'PENDING'), (" + p1 + ", " + vA + ", 100000, 'PENDING')");
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status, paid_at) VALUES (" + p2 + ", " + vB + ", 200000, 'PAID', NOW())");
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status) VALUES (" + p2 + ", " + vB + ", 200000, 'PENDING')");
        exec("INSERT INTO invoices(patient_id, visit_id, total_amount, status, paid_at) VALUES (" + p2 + ", " + vC + ", 300000, 'PAID', NOW()), (" + p2 + ", " + vC + ", 300000, 'PAID', NOW())");

        // Cấp phát trùng, tồn kho âm, kết quả xét nghiệm trùng
        exec("INSERT INTO prescriptions(visit_id) VALUES (" + vB + ")");
        long rx = count("SELECT MAX(id) FROM prescriptions");
        exec("INSERT INTO dispenses(dispensed_by, prescription_id) VALUES (" + doctor + ", " + rx + "), (" + doctor + ", " + rx + ")");
        exec("INSERT INTO drugs(code, name, stock_quantity) VALUES ('DRUG-NEG', 'Tồn âm', -15)");
        exec("INSERT INTO lab_orders(test_type, visit_id) VALUES ('Glucose máu', " + vB + ")");
        long lo = count("SELECT MAX(id) FROM lab_orders");
        exec("INSERT INTO lab_results(lab_order_id, result_text, resulted_at) VALUES (" + lo + ", '5.2', '2026-10-02 11:00:00'), (" + lo + ", '5.2', '2026-10-02 11:00:00')");

        long invoicesBefore = count("SELECT COUNT(*) FROM invoices");

        flyway("latest").migrate();

        // Không bản ghi hóa đơn nào bị xóa (đặc biệt các hóa đơn đã thu)
        assertEquals(invoicesBefore, count("SELECT COUNT(*) FROM invoices"));
        // Mỗi ca khám còn đúng 1 hóa đơn hiệu lực
        assertEquals(1, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + vA + " AND status IN ('PENDING','PAID')"));
        assertEquals(1, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + vB + " AND status IN ('PENDING','PAID')"));
        assertEquals(1, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + vC + " AND status IN ('PENDING','PAID')"));
        // Hóa đơn ĐÃ THU được ưu tiên giữ khi trùng với PENDING mới hơn
        assertEquals(1, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + vB + " AND status = 'PAID'"));
        // Thu trùng: bản thừa bị hủy kèm lý do để đối soát hoàn tiền
        assertEquals(1, count("SELECT COUNT(*) FROM invoices WHERE visit_id = " + vC + " AND status = 'CANCELLED' AND void_reason LIKE 'Thu trùng%'"));

        assertEquals(1, count("SELECT COUNT(*) FROM dispenses WHERE prescription_id = " + rx));
        assertEquals(0, count("SELECT stock_quantity FROM drugs WHERE code = 'DRUG-NEG'"));
        assertEquals(1, count("SELECT COUNT(*) FROM lab_results WHERE lab_order_id = " + lo));
        assertEquals(1, count("SELECT COUNT(*) FROM visits WHERE appointment_id = " + appt));
        assertEquals(2, count("SELECT COUNT(*) FROM visits WHERE patient_id = " + p1)); // dữ liệu lâm sàng vẫn còn
        assertEquals(vA, count("SELECT MIN(id) FROM visits WHERE appointment_id = " + appt));
    }
}
