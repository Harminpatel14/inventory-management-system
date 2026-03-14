<?php
// ── reset_password.php ──────────────────────────────────
require 'cors.php';
require 'db.php';

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email']    ?? '');
$pw    = trim($data['password'] ?? '');
$role  = trim($data['role']     ?? '');

if (!$email || !$pw || !$role) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit();
}
if (strlen($pw) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
    exit();
}

$db   = getDB();
$hash = password_hash($pw, PASSWORD_BCRYPT);
$stmt = $db->prepare('UPDATE users SET password = ? WHERE email = ? AND role = ?');
$stmt->bind_param('sss', $hash, $email, $role);
$stmt->execute();
$updated = $stmt->affected_rows;
$stmt->close();
$db->close();

if ($updated === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'User not found.']);
} else {
    echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
}
?>
