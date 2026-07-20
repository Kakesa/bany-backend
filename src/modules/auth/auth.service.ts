import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export class AuthService {
  async login(email?: string, password?: string) {
    if (!email || !password) {
      throw Object.assign(new Error('Email et mot de passe requis'), { status: 400 });
    }

    if (email.toLowerCase() !== env.adminEmail.toLowerCase()) {
      throw Object.assign(new Error('Identifiants incorrects'), { status: 401 });
    }

    const isHashed = env.adminPassword.startsWith('$2');
    const ok = isHashed
      ? await bcrypt.compare(password, env.adminPassword)
      : password === env.adminPassword;

    if (!ok) {
      throw Object.assign(new Error('Identifiants incorrects'), { status: 401 });
    }

    const token = jwt.sign({ email: env.adminEmail, role: 'admin' }, env.jwtSecret, {
      expiresIn: '7d',
    });

    return { token, email: env.adminEmail };
  }

  me(token?: string) {
    if (!token) {
      throw Object.assign(new Error('Non authentifié'), { status: 401 });
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret) as { email: string };
      return { email: payload.email };
    } catch {
      throw Object.assign(new Error('Token invalide'), { status: 401 });
    }
  }
}

export const authService = new AuthService();
