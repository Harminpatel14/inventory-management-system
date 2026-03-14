<?php
// ── forgot_password.php ─────────────────────────────────
require 'cors.php';
require 'db.php';

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$role  = trim($data['role']  ?? '');

if (!$email || !$role) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required.']);
    exit();
}

$db   = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND role = ?');
$stmt->bind_param('ss', $email, $role);
$stmt->execute();
$stmt->store_result();
$found = $stmt->num_rows > 0;
$stmt->close();
$db->close();

if (!$found) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No account found with that email.']);
    exit();
}

// In production: send a real OTP email here
echo json_encode(['success' => true, 'message' => 'OTP sent! (Demo: use 123456)']);
?>
