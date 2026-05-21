<?php
/**
 * API DE CONFIGURACIÓN DEL SISTEMA (BRANDING)
 * 
 * PHP version 8.2
 * PostgreSQL 14+
 *
 * @category Backend_API
 * @package  Campus_Virtual
 * @author   CIIDEG DevTeam
 * @license  Proprietary
 * @link     https://ciideg.edu.pe
 */

require_once 'config.php';
require_once 'auth.php';
require_once 'sanitize.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Mapa de correspondencia entre claves camelCase del Frontend y snake_case de la Base de Datos
$KEYS_MAP = [
    'primaryColor'         => 'primary_color',
    'secondaryColor'       => 'secondary_color',
    'accentColor'          => 'accent_color',
    'logoUrl'              => 'logo_url',
    'campusName'           => 'platform_name',
    'yapeNumber'           => 'payment_yape_number',
    'yapeName'             => 'payment_yape_name',
    'bankName'             => 'payment_bank_name',
    'bankAccount'          => 'payment_bank_account',
    'bankCci'              => 'payment_cci_account',
    'bankHolder'           => 'payment_account_holder',
    'bankDni'              => 'payment_bank_dni',
    'currency'             => 'currency',
    'currencyCode'         => 'currency_code',
    'paymentInstructions'  => 'payment_instructions',
    'enablePayments'       => 'enable_payments',
    'supportEmail'         => 'support_email',
    'maxUploadMb'          => 'max_upload_mb'
];

// Mapa de tipos de datos para cada configuración
$TYPES_MAP = [
    'primary_color'         => 'string',
    'secondary_color'       => 'string',
    'accent_color'          => 'string',
    'logo_url'              => 'string',
    'platform_name'         => 'string',
    'payment_yape_number'   => 'string',
    'payment_yape_name'     => 'string',
    'payment_bank_name'     => 'string',
    'payment_bank_account'  => 'string',
    'payment_cci_account'   => 'string',
    'payment_account_holder' => 'string',
    'payment_bank_dni'      => 'string',
    'currency'              => 'string',
    'currency_code'         => 'string',
    'payment_instructions'  => 'string',
    'enable_payments'       => 'boolean',
    'support_email'         => 'string',
    'max_upload_mb'          => 'number'
];

switch ($method) {
    case 'GET':
        getSystemSettings($pdo, $KEYS_MAP);
        break;
    case 'PUT':
    case 'PATCH':
        updateSystemSettings($pdo, $KEYS_MAP, $TYPES_MAP);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido"]);
}

/**
 * Obtiene la configuración del sistema desde la base de datos.
 *
 * @param PDO   $pdo      Conexión a la base de datos
 * @param array $keysMap  Mapa de claves camelCase/snake_case
 * 
 * @return void
 */
function getSystemSettings($pdo, $keysMap) {
    // Control de caché de 5 minutos (300 segundos)
    $cacheControl = isset($_SERVER['HTTP_CACHE_CONTROL']) ? $_SERVER['HTTP_CACHE_CONTROL'] : '';
    if (stripos($cacheControl, 'no-cache') === false) {
        header('Cache-Control: public, max-age=300');
    } else {
        header('Cache-Control: no-cache, no-store, must-revalidate');
    }

    try {
        $stmt = $pdo->query("SELECT key_name, key_value, data_type FROM system_settings");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convertir el mapeo de base de datos a formato JSON estructurado en camelCase para el frontend
        $settings = [];
        
        // Invertimos el mapa para convertir de snake_case a camelCase
        $reversedMap = array_flip($keysMap);

        foreach ($results as $row) {
            $key = $row['key_name'];
            $value = $row['key_value'];
            $type = $row['data_type'];

            // Si la clave no está en nuestro mapa reverso, la mantenemos como está
            $frontendKey = isset($reversedMap[$key]) ? $reversedMap[$key] : $key;

            // Conversión de tipos
            switch ($type) {
                case 'boolean':
                    $settings[$frontendKey] = ($value === 'true' || $value === '1');
                    break;
                case 'number':
                    $settings[$frontendKey] = (float)$value;
                    break;
                case 'json':
                    $settings[$frontendKey] = json_decode($value, true);
                    break;
                default:
                    $settings[$frontendKey] = $value;
                    break;
            }
        }

        echo json_encode([
            "success" => true,
            "data" => $settings
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        error_log('[SystemSettings] Read error: ' . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Error al consultar configuraciones"]);
    }
}

/**
 * Actualiza una o más configuraciones en la base de datos (Requiere ADMIN/GESTOR).
 *
 * @param PDO   $pdo      Conexión a la base de datos
 * @param array $keysMap  Mapa de claves frontend a backend
 * @param array $typesMap Mapa de tipos de datos admitidos
 * 
 * @return void
 */
function updateSystemSettings($pdo, $keysMap, $typesMap) {
    // Validar autorización de escritura (Requiere ADMIN o GESTOR)
    $auth = require_auth();
    if (!in_array($auth['role'], ['ADMIN', 'GESTOR'], true)) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No tienes permisos para modificar la configuración"]);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    // Desanidar datos si vienen dentro de la llave "data" (estilo React/Vite wrapper)
    $data = isset($input['data']) ? $input['data'] : $input;

    if (!is_array($data) || empty($data)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos de entrada no válidos o vacíos"]);
        exit();
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO system_settings (key_name, key_value, data_type, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (key_name) 
            DO UPDATE SET 
                key_value = EXCLUDED.key_value, 
                data_type = EXCLUDED.data_type,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
        ");

        foreach ($data as $frontendKey => $value) {
            // Validar que la clave enviada exista en la whitelist
            if (!isset($keysMap[$frontendKey])) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Clave de configuración no permitida: " . $frontendKey]);
                exit();
            }

            $dbKey = $keysMap[$frontendKey];
            $dataType = $typesMap[$dbKey];
            $dbValue = '';

            // Validación y parseo según tipo
            if ($dataType === 'boolean') {
                $dbValue = ($value === true || $value === 'true' || $value === 1 || $value === '1') ? 'true' : 'false';
            } elseif ($dataType === 'number') {
                if (!is_numeric($value)) {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Valor no numérico para: " . $frontendKey]);
                    exit();
                }
                $dbValue = (string)$value;
            } elseif ($dataType === 'json') {
                // Si el valor ya es un array o un objeto en PHP, lo convertimos a string JSON
                if (is_array($value) || is_object($value)) {
                    $dbValue = json_encode($value);
                } else {
                    $dbValue = $value;
                }
                
                // Validar que sea JSON válido
                json_decode($dbValue);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Formato JSON no válido para: " . $frontendKey]);
                    exit();
                }
            } else {
                // String: sanitizar
                $dbValue = sanitize_plain_text((string)$value, 10000);
            }

            $stmt->execute([
                $dbKey,
                $dbValue,
                $dataType,
                $auth['sub'] // ID de usuario que actualiza
            ]);
        }

        $pdo->commit();
        error_log('[SystemSettings] Action: Update successful. User ID: ' . $auth['sub']);

        echo json_encode([
            "success" => true,
            "message" => "Configuraciones actualizadas exitosamente"
        ]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        error_log('[SystemSettings] Update error: ' . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Error al actualizar configuraciones en base de datos"]);
    }
}
