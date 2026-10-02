<?php
/**
 * NOVA SmartStock - Lightweight Mock REST API
 * Supports GET/POST for stores and product inventory.
 * Fully compatible with Apache / XAMPP PHP 8.2 runtime.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? 'status';

if ($action === 'status') {
    echo json_encode([
        'status' => 'online',
        'service' => 'NOVA SmartStock API',
        'version' => '1.0.0-prototype',
        'timestamp' => date('c'),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'PHP/' . phpversion()
    ]);
    exit;
}

if ($action === 'stores') {
    // Return sample store list
    $storesFile = __DIR__ . '/js/data/stores.js';
    echo json_encode([
        'status' => 'success',
        'totalStores' => 10,
        'cityCoverage' => ['Bengaluru', 'Mumbai', 'Hyderabad'],
        'networkStoreCount' => 620
    ]);
    exit;
}

if ($action === 'update_stock' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!$payload || !isset($payload['productId'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing productId or payload']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Inventory updated successfully.',
        'updatedProduct' => [
            'productId' => $payload['productId'],
            'newStock' => $payload['stock'] ?? 0,
            'isAvailable' => $payload['isAvailable'] ?? true,
            'lastVerified' => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}

// Fallback response
echo json_encode([
    'status' => 'ok',
    'endpoints' => [
        '?action=status',
        '?action=stores',
        '?action=update_stock [POST]'
    ]
]);
