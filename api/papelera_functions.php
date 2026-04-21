<?php

// Function declarations for papelera operations

function actualizarEstructuraPapelera($pdo) {
    try {
        // Agregar campos de papelera a directivas si no existen
        $checkDirectivas = $pdo->query("PRAGMA table_info(directivas)")->fetchAll();
        $hasEliminadaDirectivas = false;
        foreach ($checkDirectivas as $col) {
            if ($col['name'] === 'eliminada') {
                $hasEliminadaDirectivas = true;
                break;
            }
        }
        
        if (!$hasEliminadaDirectivas) {
            $pdo->exec("ALTER TABLE directivas ADD COLUMN eliminada INTEGER DEFAULT 0");
            $pdo->exec("ALTER TABLE directivas ADD COLUMN fecha_eliminacion TEXT");
            $pdo->exec("ALTER TABLE directivas ADD COLUMN eliminado_por INTEGER");
        }
        
        // Agregar campos de papelera a proyectos si no existen
        $checkProyectos = $pdo->query("PRAGMA table_info(proyectos)")->fetchAll();
        $hasEliminadaProyectos = false;
        foreach ($checkProyectos as $col) {
            if ($col['name'] === 'eliminada') {
                $hasEliminadaProyectos = true;
                break;
            }
        }
        
        if (!$hasEliminadaProyectos) {
            $pdo->exec("ALTER TABLE proyectos ADD COLUMN eliminada INTEGER DEFAULT 0");
            $pdo->exec("ALTER TABLE proyectos ADD COLUMN fecha_eliminacion TEXT");
            $pdo->exec("ALTER TABLE proyectos ADD COLUMN eliminado_por INTEGER");
        }
        
        return true;
    } catch (Exception $e) {
        return false;
    }
}
