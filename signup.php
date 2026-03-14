<?php
// ── signup.php ──────────────────────────────────────────
require 'cors.php';
require 'db.php';

$data  = json_decode(file_get_contents('php://input'), true);
$name  = trim($data['name']     ?? '');
$email = trim($data['email']    ?? '');
$pw    = trim($data['password'] ?? '');
$role  = trim($data['role']     ?? '');   // 'Inventory Manager' or 'Warehouse Staff'

// Validation
if (!$name || !$email || !$pw || !$role) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit();
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit();
}
if (strlen($pw) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
    exit();
}

$db = getDB();

// Check duplicate email + role
$chk = $db->prepare('SELECT id FROM users WHERE email = ? AND role = ?');
$chk->bind_param('ss', $email, $role);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'Email already registered for this role.']);
    $chk->close(); $db->close();
    exit();
}
$chk->close();

// Insert
$hash = password_hash($pw, PASSWORD_BCRYPT);
$ins  = $db->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
$ins->bind_param('ssss', $name, $email, $hash, $role);

if ($ins->execute()) {
    echo json_encode([
        'success' => true,
        'user'    => ['name' => $name, 'email' => $email, 'role' => $role],
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Signup failed. Try again.']);
}

$ins->close();
$db->close();
?>
