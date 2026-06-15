<?php
// Database configuration - PostgreSQL with Render
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_user = getenv('DB_USER') ?: 'postgres';
$db_pass = getenv('DB_PASS') ?: 'joel123';
$db_name = getenv('DB_NAME') ?: 'taskify_db';
$db_port = getenv('DB_PORT') ?: 5432;

// Create PostgreSQL connection using PDO
try {
    $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
    $conn = new PDO($dsn, $db_user, $db_pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]));
}
?>
