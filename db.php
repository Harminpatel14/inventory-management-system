<?php
// ── db.php ─────────────────────────────────────────────
// Database connection — included by every API file

define('DB_HOST', 'localhost');
define('DB_USER', 'root');   // default XAMPP username
define('DB_PASS', '');       // default XAMPP password is empty
define('DB_NAME', 'coreinventory');

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB connection failed: ' . $conn->connect_error]);
        exit();
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}
?>
