import { useState, useEffect } from 'react';
import { crearCredencialBiometrica, plataformaBiometricaDisponible } from '../../../utils/webauthn.ts';
import { recargarEnvioEmail } from '../../../hooks/useEnvioEmail.ts';

export type Message = { type: 'success' | 'error' | ''; text: string };

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_email: string;
  smtp_secure: boolean;
  send_delay_ms: number;
  guardar_enviados: boolean;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_folder: string;
}

export function useConfiguracion() {
  // ── Email Config ──
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtp_host: 'smtp01.educa.madrid.org',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    smtp_email: '',
    smtp_secure: true,
    send_delay_ms: 1500,
    guardar_enviados: true,
    imap_host: 'imap.educa.madrid.org',
    imap_port: 993,
    imap_secure: true,
    imap_folder: 'Sent',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [successEmail, setSuccessEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');

  // ── Test Email ──
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Profesor data (para test-email y mostrar en UI) ──
  const [profesorEmail, setProfesorEmail] = useState('');
  const [profesorNombre, setProfesorNombre] = useState('');
  const [profesorApellidos, setProfesorApellidos] = useState('');

  // ── Seguridad / cifrado ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

  // ── Desbloqueo biométrico ──
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBiometricEnableModal, setShowBiometricEnableModal] = useState(false);
  const [showBiometricDisableModal, setShowBiometricDisableModal] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<Message>({ type: '', text: '' });

  // ── Efectos ──

  useEffect(() => {
    checkEncryptionStatus();
    checkBiometricStatus();
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
          smtp_email: cfg.smtp_email || (cfg.smtp_user ? `${cfg.smtp_user}@educa.madrid.org` : ''),
          smtp_secure: cfg.smtp_secure === '1',
          send_delay_ms: cfg.send_delay_ms ? Number(cfg.send_delay_ms) : 1500,
          guardar_enviados: cfg.guardar_enviados === undefined ? true : cfg.guardar_enviados === '1',
          imap_host: cfg.imap_host || 'imap.educa.madrid.org',
          imap_port: cfg.imap_port ? Number(cfg.imap_port) : 993,
          imap_secure: cfg.imap_secure === undefined ? true : cfg.imap_secure === '1',
          imap_folder: cfg.imap_folder || 'Sent',
        });
      }
      // Cargar datos del profesor
      const profRes = await fetch('/api/profesor');
      const profesor = await profRes.json();
      if (profesor) {
        setProfesorEmail(profesor.email || '');
        setProfesorNombre(profesor.nombre || '');
        setProfesorApellidos(profesor.apellidos || '');
      }
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

  // ── Handlers: Desbloqueo biométrico ──

  const checkBiometricStatus = async () => {
    if (!window.biometric) {
      setBiometricAvailable(false);
      return;
    }
    try {
      const status = await window.biometric.status();
      setBiometricAvailable(status.available);
      setBiometricEnabled(status.enabled);
      setBiometricCredentialId(status.credentialId);
    } catch {
      setBiometricAvailable(false);
    }
  };

  const requestEnableBiometric = async () => {
    setBiometricMessage({ type: '', text: '' });
    if (!window.biometric || !biometricAvailable) {
      setBiometricMessage({ type: 'error', text: 'Windows Hello / almacenamiento seguro no está disponible en este equipo.' });
      return;
    }
    const plataforma = await plataformaBiometricaDisponible();
    if (!plataforma) {
      setBiometricMessage({ type: 'error', text: 'No se ha configurado ningún dato biométrico (PIN, huella o rostro) en Windows.' });
      return;
    }
    setBiometricPassword('');
    setShowBiometricEnableModal(true);
  };

  const cancelEnableBiometric = () => {
    setShowBiometricEnableModal(false);
    setBiometricPassword('');
  };

  const executeEnableBiometric = async () => {
    if (!biometricPassword) {
      setBiometricMessage({ type: 'error', text: 'Introduce tu contraseña maestra.' });
      return;
    }
    setBiometricBusy(true);
    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: biometricPassword }),
      });
      if (!res.ok) {
        setBiometricMessage({ type: 'error', text: 'La contraseña maestra no es correcta.' });
        return;
      }

      const cred = await crearCredencialBiometrica();
      if (!cred.ok) {
        const mensajes: Record<string, string> = {
          cancelado: 'Se canceló el registro biométrico.',
          'ya-existe': 'Ya existe una credencial biométrica registrada en este equipo.',
          'rp-id-invalido':
            'El origen de la aplicación no coincide con el dominio de la credencial. Cierra y vuelve a abrir la aplicación e inténtalo de nuevo.',
          'no-contexto-seguro':
            'Windows Hello requiere un origen seguro. Abre la aplicación desde su icono, no desde una URL.',
        };
        setBiometricMessage({
          type: 'error',
          text: mensajes[cred.error] ?? 'No se pudo crear la credencial biométrica en este equipo.',
        });
        return;
      }

      const saved = await window.biometric!.save({
        credentialId: cred.credentialId!,
        password: biometricPassword,
      });
      if (!saved.ok) {
        setBiometricMessage({ type: 'error', text: saved.error || 'No se pudo guardar la configuración biométrica.' });
        return;
      }

      setBiometricEnabled(true);
      setBiometricCredentialId(cred.credentialId!);
      setBiometricMessage({ type: 'success', text: 'Desbloqueo biométrico activado. Podrás desbloquear la aplicación con Windows Hello.' });
      cancelEnableBiometric();
    } catch {
      setBiometricMessage({ type: 'error', text: 'Error al activar el desbloqueo biométrico.' });
    } finally {
      setBiometricBusy(false);
    }
  };

  const executeDisableBiometric = async () => {
    setBiometricBusy(true);
    try {
      const deleted = await window.biometric!.delete();
      if (!deleted.ok) {
        setBiometricMessage({ type: 'error', text: deleted.error || 'No se pudo desactivar el desbloqueo biométrico.' });
        return;
      }
      setBiometricEnabled(false);
      setBiometricCredentialId(null);
      setBiometricMessage({ type: 'success', text: 'Desbloqueo biométrico desactivado. La contraseña maestra protegida se ha eliminado.' });
      setShowBiometricDisableModal(false);
    } catch {
      setBiometricMessage({ type: 'error', text: 'Error al desactivar el desbloqueo biométrico.' });
    } finally {
      setBiometricBusy(false);
    }
  };

  const requestDisableBiometric = () => {
    setBiometricMessage({ type: '', text: '' });
    setShowBiometricDisableModal(true);
  };

  const cancelDisableBiometric = () => {
    setShowBiometricDisableModal(false);
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
        recargarEnvioEmail(); // GF-76: puede pasar a estar configurado
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
          smtp_email: emailConfig.smtp_email,
          smtp_secure: emailConfig.smtp_secure,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const baseMsg = `Correo de prueba enviado a ${profesorEmail}`;
        let message = baseMsg;
        if (data.copiadoEnviados === 'ok') {
          message = `${baseMsg}. Copia guardada en Enviados.`;
        } else if (data.copiadoEnviados === 'error') {
          message = `${baseMsg}. AVISO: no se pudo guardar la copia en Enviados (${data.imapError || 'error de conexión IMAP'}).`;
        }
        setTestEmailResult({ type: 'success', message });
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

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);

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
        if (biometricEnabled && biometricCredentialId && window.biometric) {
          const saved = await window.biometric.save({ credentialId: biometricCredentialId, password: newPassword });
          if (!saved.ok) {
            await window.biometric.delete();
            setBiometricEnabled(false);
            setBiometricCredentialId(null);
            setMessage({ type: 'error', text: 'Contraseña actualizada. No se pudo actualizar el desbloqueo biométrico y se ha desactivado; vuelve a activarlo en esta pestaña.' });
          } else {
            setMessage({ type: 'success', text: 'Base de datos cifrada correctamente. Se requerirá en el próximo inicio.' });
          }
        } else {
          setMessage({ type: 'success', text: 'Base de datos cifrada correctamente. Se requerirá en el próximo inicio.' });
        }
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

  const executeDecryption = async () => {
    setIsDecrypting(true);
    try {
      const res = await fetch('/api/auth/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        if (biometricEnabled && window.biometric) {
          await window.biometric.delete();
          setBiometricEnabled(false);
          setBiometricCredentialId(null);
        }
        setMessage({ type: 'success', text: 'Cifrado eliminado. La aplicación se recargará.' });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        throw new Error('Error al eliminar el cifrado');
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el cifrado de la base de datos.' });
      setIsDecrypting(false);
      setShowDecryptModal(false);
    }
  };

  return {
    // Email
    emailConfig, setEmailConfig,
    savingEmail, successEmail, errorEmail,
    handleSaveEmailConfig,
    // Test Email
    testingEmail, testEmailResult,
    profesorEmail, profesorNombre, profesorApellidos,
    handleTestEmail,
    // Cifrado
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    isEncrypting, isEncrypted,
    isDecrypting, showDecryptModal, setShowDecryptModal,
    showConfirmModal, setShowConfirmModal,
    message,
    handleEncryptDatabase, executeEncryption, executeDecryption,
    // Desbloqueo biométrico
    biometricEnabled, biometricAvailable, biometricBusy,
    biometricPassword, setBiometricPassword,
    biometricMessage,
    showBiometricEnableModal, showBiometricDisableModal,
    requestEnableBiometric, cancelEnableBiometric, executeEnableBiometric,
    requestDisableBiometric, cancelDisableBiometric, executeDisableBiometric,
  };
}
