<?php
require_once __DIR__ . '/../config/auth_helper.php';
sessionStart(); session_unset(); session_destroy();
header('Location: ../index.html'); exit;
