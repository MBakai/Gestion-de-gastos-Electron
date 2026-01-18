// src/database/auth.service.ts
import { DatabaseService } from './database.service';
import * as crypto from 'crypto';

export class AuthService {
    private db = DatabaseService.getInstance().connection;

    // Hashing scrypt: alto nivel de seguridad
    private hash(text: string): string {
        // Usamos un salt fijo para simplicidad en este entorno local personal, 
        // o podrías generar uno por usuario. Para este caso, un salt estático fuerte es suficiente.
        const salt = 'sistema-contable-carlitos-2024';
        return crypto.scryptSync(text, salt, 64).toString('hex');
    }

    existeUsuario(): boolean {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM usuarios');
        const result = stmt.get() as { count: number };
        return result.count > 0;
    }

    registrarUsuario(nickname: string, password: string, pregunta: string, respuesta: string): boolean {
        const passHash = this.hash(password);
        const respHash = this.hash(respuesta.toLowerCase().trim());

        const stmt = this.db.prepare(
            'INSERT INTO usuarios (nickname, password, pregunta_seguridad, respuesta_seguridad) VALUES (?, ?, ?, ?)'
        );
        const result = stmt.run(nickname, passHash, pregunta, respHash);
        return result.changes > 0;
    }

    login(nickname: string, password: string): boolean {
        const passHash = this.hash(password);
        const stmt = this.db.prepare('SELECT id FROM usuarios WHERE nickname = ? AND password = ?');
        const user = stmt.get(nickname, passHash);
        return !!user;
    }

    obtenerPreguntaSeguridad(): string | null {
        const stmt = this.db.prepare('SELECT pregunta_seguridad FROM usuarios LIMIT 1');
        const user = stmt.get() as { pregunta_seguridad: string } | undefined;
        return user ? user.pregunta_seguridad : null;
    }

    verificarRecuperacion(respuesta: string): boolean {
        const respHash = this.hash(respuesta.toLowerCase().trim());
        const stmt = this.db.prepare('SELECT id FROM usuarios WHERE respuesta_seguridad = ?');
        const user = stmt.get(respHash);
        return !!user;
    }

    resetPassword(nuevaPassword: string): boolean {
        const passHash = this.hash(nuevaPassword);
        const stmt = this.db.prepare('UPDATE usuarios SET password = ?');
        const result = stmt.run(passHash);
        return result.changes > 0;
    }
}
