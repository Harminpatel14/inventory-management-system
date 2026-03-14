<?php
// ── login.php ───────────────────────────────────────────
require 'cors.php';
require 'db.php';

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email']    ?? '');
$pw    = trim($data['password'] ?? '');
$role  = trim($data['role']     ?? '');

if (!$email || !$pw || !$role) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit();
}

$db   = getDB();
$stmt = $db->prepare('SELECT name, email, password, role FROM users WHERE email = ? AND role = ?');
$stmt->bind_param('ss', $email, $role);
$stmt->execute();
$result = $stmt->get_result();
$user   = $result->fetch_assoc();
$stmt->close();
$db->close();

if (!$user || !password_verify($pw, $user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit();
}

echo json_encode([
    'success' => true,
    'user'    => ['name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']],
]);
?>
