<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true);

// Route requests
switch ($method) {

    // ── READ: Get all tasks or single task ───────────────────────
    case 'GET':
        if (isset($_GET['id'])) {
            $id   = (int) $_GET['id'];
            $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $task   = $result->fetch_assoc();
            if ($task) {
                echo json_encode(['success' => true, 'data' => $task]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Task not found.']);
            }
        } else {
            // Optional filter by status
            $where = "";
            $params = [];
            $types  = "";

            if (!empty($_GET['status'])) {
                $where    = " WHERE status = ?";
                $params[] = $_GET['status'];
                $types   .= "s";
            }

            $sql    = "SELECT * FROM tasks" . $where . " ORDER BY created_at DESC";
            $stmt   = $conn->prepare($sql);
            if ($types) $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            $tasks  = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'data' => $tasks]);
        }
        break;

    // ── CREATE: Add new task ─────────────────────────────────────
    case 'POST':
        $errors = validateTask($input);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'errors' => $errors]);
            break;
        }

        $title       = trim($input['title']);
        $description = trim($input['description'] ?? '');
        $priority    = $input['priority']  ?? 'Medium';
        $status      = $input['status']    ?? 'Pending';
        $due_date    = !empty($input['due_date']) ? $input['due_date'] : null;

        $stmt = $conn->prepare(
            "INSERT INTO tasks (title, description, priority, status, due_date)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("sssss", $title, $description, $priority, $status, $due_date);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Task created successfully.',
                'id'      => $conn->insert_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create task.']);
        }
        break;

    // ── UPDATE: Edit existing task ───────────────────────────────
    case 'PUT':
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Task ID is required.']);
            break;
        }

        $errors = validateTask($input);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'errors' => $errors]);
            break;
        }

        $id          = (int) $input['id'];
        $title       = trim($input['title']);
        $description = trim($input['description'] ?? '');
        $priority    = $input['priority']  ?? 'Medium';
        $status      = $input['status']    ?? 'Pending';
        $due_date    = !empty($input['due_date']) ? $input['due_date'] : null;

        $stmt = $conn->prepare(
            "UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=?
             WHERE id=?"
        );
        $stmt->bind_param("sssssi", $title, $description, $priority, $status, $due_date, $id);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Task updated successfully.']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Task not found or no changes made.']);
        }
        break;

    // ── DELETE: Remove a task ────────────────────────────────────
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Task ID is required.']);
            break;
        }

        $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Task deleted successfully.']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Task not found.']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}

$conn->close();

// ── Validation helper ────────────────────────────────────────────
function validateTask($data) {
    $errors = [];
    if (empty(trim($data['title'] ?? ''))) {
        $errors[] = 'Title is required.';
    } elseif (strlen(trim($data['title'])) > 150) {
        $errors[] = 'Title must not exceed 150 characters.';
    }
    $allowed_priorities = ['Low', 'Medium', 'High'];
    if (!empty($data['priority']) && !in_array($data['priority'], $allowed_priorities)) {
        $errors[] = 'Invalid priority value.';
    }
    $allowed_statuses = ['Pending', 'In Progress', 'Completed'];
    if (!empty($data['status']) && !in_array($data['status'], $allowed_statuses)) {
        $errors[] = 'Invalid status value.';
    }
    if (!empty($data['due_date']) && !strtotime($data['due_date'])) {
        $errors[] = 'Invalid due date format.';
    }
    return $errors;
}
?>
