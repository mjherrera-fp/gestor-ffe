import { useState, useEffect } from 'react';

export type Message = { type: 'success' | 'error' | ''; text: string };

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  send_delay_ms: number;
}

export function useConfiguracion() {
  // ── Email Config ──
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtp_host: 'smtp01.educa.madrid.org',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: true,
    send_delay_ms: 1500,
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [successEmail, setSuccessEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');

  // ── Test Email ──
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Profesor email (para prueba) ──
  const [profesorEmail, setProfesorEmail] = useState('');

  // ── Seguridad / cifrado ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

  // ── Efectos ──

  useEffect(() => {
    checkEncryptionStatus();
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    try {
      const res = await fetch('/api/profesor/config/correo');
      if (res.ok) {
        const cfg = await res.json();
        setEmailConfig({
          smtp_host: cfg.smtp_host || 'smtp01.educa.madrid.org',
          smtp_port: cfg.smtp_port ? Number(cfg.smtp_port) : 465,
          smtp_user: cfg.smtp_user || '',
          smtp_pass: cfg.smtp_pass || '',
          smtp_secure: cfg.smtp_secure === '1',
          send_delay_ms: cfg.send_delay_ms ? Number(cfg.send_delay_ms) : 1500,
        });
      }
      // Cargar email del profesor para test-email
      const profRes = await fetch('/api/profesor');
      const profesor = await profRes.json();
      if (profesor) setProfesorEmail(profesor.email || '');
    } catch {
      console.error('Error al cargar configuración de correo');
    }
  };

  const checkEncryptionStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsEncrypted(data.encrypted);
    } catch {
      console.error('Error al comprobar estado de cifrado');
    }
  };

  // ── Handlers: Email ──

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setSuccessEmail(false);
    setErrorEmail('');


    try {
      const res = await fetch('/api/profesor/config/correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessEmail(true);
        setTimeout(() => setSuccessEmail(false), 3000);
      } else {
        setErrorEmail('Error al guardar en el servidor');
      }
    } catch {
      setErrorEmail('Error de conexión al servidor');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (!profesorEmail) {
      setTestEmailResult({ type: 'error', message: 'No hay email de profesor configurado' });
      return;
    }
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/profesor/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profesorEmail,
          smtp_host: emailConfig.smtp_host,
          smtp_port: emailConfig.smtp_port,
          smtp_user: emailConfig.smtp_user,
          smtp_pass: emailConfig.smtp_pass,
          smtp_secure: emailConfig.smtp_secure,
        }),
      });
      if (res.ok) {
        setTestEmailResult({ type: 'success', message: `Correo de prueba enviado a ${profesorEmail}` });
      } else {
        const data = await res.json();
        setTestEmailResult({ type: 'error', message: data.error || 'Error al enviar correo de prueba' });
      }
    } catch {
      setTestEmailResult({ type: 'error', message: 'Error de conexión al servidor' });
    } finally {
      setTestingEmail(false);
    }
  };

  // ── Handlers: Cifrado ──

  const handleEncryptDatabase = () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }
    setShowConfirmModal(true);
  };

  const executeEncryption = async () => {
    setIsEncrypting(true);
    try {
      const res = await fetch('/api/auth/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Base de datos cifrada correctamente. Se requerirá en el próximo inicio.' });
        setNewPassword('');
        setConfirmPassword('');
        setIsEncrypted(true);
      } else {
        throw new Error('Error al cifrar');
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cifrar la base de datos.' });
    } finally {
      setIsEncrypting(false);
      setShowConfirmModal(false);
    }
  };

  return {
    // Email
    emailConfig, setEmailConfig,
    savingEmail, successEmail, errorEmail,
    handleSaveEmailConfig,
    // Test Email
    testingEmail, testEmailResult,
    profesorEmail,
    handleTestEmail,
    // Cifrado
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    isEncrypting, isEncrypted,
    showConfirmModal, setShowConfirmModal,
    message,
    handleEncryptDatabase, executeEncryption,
  };
}
