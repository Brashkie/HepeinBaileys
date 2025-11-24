import type { Logger } from 'pino';
import type { HepeinSocket } from '../types';
import { proto } from '@whiskeysockets/baileys';

/**
 * Handler profesional para gestión de grupos
 */
export class GroupHandler {
  private socket: HepeinSocket;
  private logger: Logger;

  constructor(socket: HepeinSocket, logger: Logger) {
    this.socket = socket;
    this.logger = logger;

    this.logger.info('GroupHandler inicializado');
  }

  /**
   * Obtener metadata del grupo
   */
  async getGroupMetadata(groupJid: string) {
    try {
      const metadata = await this.socket.groupMetadata(groupJid);
      
      // Cachear metadata
      await this.socket.cache.saveGroupInfo(groupJid, metadata);

      return metadata;
    } catch (error) {
      this.logger.error({ error, groupJid }, 'Error obteniendo metadata de grupo');
      
      // Intentar obtener del caché
      const cached = await this.socket.cache.getGroupInfo(groupJid);
      if (cached) {
        return cached;
      }

      throw error;
    }
  }

  /**
   * Crear grupo
   */
  async createGroup(
    name: string,
    participants: string[]
  ): Promise<{ gid: string; participants: any[] }> {
    try {
      this.logger.info({ name, participantsCount: participants.length }, 'Creando grupo');

      const result = await this.socket.groupCreate(name, participants);

      this.logger.info({ gid: result.id }, '✅ Grupo creado');
      
      return { gid: result.id, participants: result.participants };
    } catch (error) {
      this.logger.error({ error }, 'Error creando grupo');
      throw error;
    }
  }

  /**
   * Agregar participantes
   */
  async addParticipants(groupJid: string, participants: string[]): Promise<any> {
    try {
      this.logger.info({ groupJid, count: participants.length }, 'Agregando participantes');

      const result = await this.socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'add'
      );

      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error agregando participantes');
      throw error;
    }
  }

  /**
   * Remover participantes
   */
  async removeParticipants(groupJid: string, participants: string[]): Promise<any> {
    try {
      this.logger.info({ groupJid, count: participants.length }, 'Removiendo participantes');

      const result = await this.socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'remove'
      );

      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error removiendo participantes');
      throw error;
    }
  }

  /**
   * Promover a admin
   */
  async promoteToAdmin(groupJid: string, participants: string[]): Promise<any> {
    try {
      this.logger.info({ groupJid, count: participants.length }, 'Promoviendo a admin');

      const result = await this.socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'promote'
      );

      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error promoviendo');
      throw error;
    }
  }

  /**
   * Degradar de admin
   */
  async demoteFromAdmin(groupJid: string, participants: string[]): Promise<any> {
    try {
      this.logger.info({ groupJid, count: participants.length }, 'Degradando de admin');

      const result = await this.socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'demote'
      );

      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error degradando');
      throw error;
    }
  }

  /**
   * Cambiar nombre del grupo
   */
  async updateGroupName(groupJid: string, name: string): Promise<void> {
    try {
      await this.socket.groupUpdateSubject(groupJid, name);
      this.logger.info({ groupJid, name }, 'Nombre de grupo actualizado');
    } catch (error) {
      this.logger.error({ error }, 'Error actualizando nombre');
      throw error;
    }
  }

  /**
   * Cambiar descripción del grupo
   */
  async updateGroupDescription(groupJid: string, description: string): Promise<void> {
    try {
      await this.socket.groupUpdateDescription(groupJid, description);
      this.logger.info({ groupJid }, 'Descripción de grupo actualizada');
    } catch (error) {
      this.logger.error({ error }, 'Error actualizando descripción');
      throw error;
    }
  }

  /**
   * Cambiar configuración del grupo
   */
  async updateGroupSettings(
    groupJid: string,
    setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
  ): Promise<void> {
    try {
      await this.socket.groupSettingUpdate(groupJid, setting);
      this.logger.info({ groupJid, setting }, 'Configuración de grupo actualizada');
    } catch (error) {
      this.logger.error({ error }, 'Error actualizando configuración');
      throw error;
    }
  }

  /**
   * Obtener código de invitación
   */
  async getInviteCode(groupJid: string): Promise<string> {
    try {
      const code = await this.socket.groupInviteCode(groupJid);
      return code ?? '';
    } catch (error) {
      this.logger.error({ error }, 'Error obteniendo código de invitación');
      throw error;
    }
  }

  /**
   * Revocar código de invitación
   */
  async revokeInviteCode(groupJid: string): Promise<string> {
    try {
      const code = await this.socket.groupRevokeInvite(groupJid);
      this.logger.info({ groupJid }, 'Código de invitación revocado');
      return code ?? '';
    } catch (error) {
      this.logger.error({ error }, 'Error revocando código');
      throw error;
    }
  }

  /**
   * Aceptar invitación a grupo
   */
  async acceptInvite(inviteCode: string): Promise<string> {
    try {
      const groupJid = await this.socket.groupAcceptInvite(inviteCode);
      this.logger.info({ groupJid }, 'Invitación aceptada');
      return groupJid ?? '';
    } catch (error) {
      this.logger.error({ error }, 'Error aceptando invitación');
      throw error;
    }
  }

  /**
   * Salir del grupo
   */
  async leaveGroup(groupJid: string): Promise<void> {
    try {
      await this.socket.groupLeave(groupJid);
      this.logger.info({ groupJid }, 'Salido del grupo');
    } catch (error) {
      this.logger.error({ error }, 'Error saliendo del grupo');
      throw error;
    }
  }

  /**
   * Obtener participantes del grupo
   */
  async getParticipants(groupJid: string): Promise<any[]> {
    try {
      const metadata = await this.getGroupMetadata(groupJid);
      return metadata.participants;
    } catch (error) {
      this.logger.error({ error }, 'Error obteniendo participantes');
      throw error;
    }
  }

  /**
   * Obtener admins del grupo
   */
  async getAdmins(groupJid: string): Promise<string[]> {
    try {
      const participants = await this.getParticipants(groupJid);
      return participants
        .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
        .map((p) => p.id);
    } catch (error) {
      this.logger.error({ error }, 'Error obteniendo admins');
      throw error;
    }
  }

  /**
   * Verificar si usuario es admin
   */
  async isAdmin(groupJid: string, userJid: string): Promise<boolean> {
    try {
      const admins = await this.getAdmins(groupJid);
      return admins.includes(userJid);
    } catch (error) {
      this.logger.error({ error }, 'Error verificando admin');
      return false;
    }
  }

  /**
   * Verificar si el bot es admin
   */
  async isBotAdmin(groupJid: string): Promise<boolean> {
    try {
      const botJid = this.socket.user?.id;
      if (!botJid) return false;

      return await this.isAdmin(groupJid, botJid);
    } catch (error) {
      this.logger.error({ error }, 'Error verificando si bot es admin');
      return false;
    }
  }

  /**
   * Enviar mensaje mencionando a todos
   */
  async mentionEveryone(
    groupJid: string,
    message: string
  ): Promise<proto.WebMessageInfo | undefined> {
    try {
      const participants = await this.getParticipants(groupJid);
      const mentions = participants.map((p) => p.id);

      return await this.socket.sendMessage(groupJid, {
        text: message,
        mentions,
      });
    } catch (error) {
      this.logger.error({ error }, 'Error mencionando a todos');
      throw error;
    }
  }

  /**
   * Obtener estadísticas del grupo
   */
  async getGroupStats(groupJid: string): Promise<{
    totalParticipants: number;
    totalAdmins: number;
    botIsAdmin: boolean;
    metadata: any;
  }> {
    try {
      const metadata = await this.getGroupMetadata(groupJid);
      const admins = await this.getAdmins(groupJid);
      const botIsAdmin = await this.isBotAdmin(groupJid);

      return {
        totalParticipants: metadata.participants.length,
        totalAdmins: admins.length,
        botIsAdmin,
        metadata: {
          subject: metadata.subject,
          desc: metadata.desc,
          creation: metadata.creation,
          owner: metadata.owner,
        },
      };
    } catch (error) {
      this.logger.error({ error }, 'Error obteniendo estadísticas');
      throw error;
    }
  }

  /**
   * Cambiar foto del grupo
   */
  async updateGroupPicture(groupJid: string, imageBuffer: Buffer): Promise<void> {
    try {
      await this.socket.updateProfilePicture(groupJid, imageBuffer);
      this.logger.info({ groupJid }, 'Foto de grupo actualizada');
    } catch (error) {
      this.logger.error({ error }, 'Error actualizando foto');
      throw error;
    }
  }

  /**
   * Obtener link de invitación completo
   */
  async getInviteLink(groupJid: string): Promise<string> {
    try {
      const code = await this.getInviteCode(groupJid);
      return `https://chat.whatsapp.com/${code}`;
    } catch (error) {
      this.logger.error({ error }, 'Error obteniendo link');
      throw error;
    }
  }

  /**
   * Banear usuario (remover y agregar a blacklist)
   */
  async banUser(
    groupJid: string,
    userJid: string,
    reason?: string
  ): Promise<void> {
    try {
      // Remover del grupo
      await this.removeParticipants(groupJid, [userJid]);

      // TODO: Agregar a blacklist persistente
      this.logger.info({ groupJid, userJid, reason }, 'Usuario baneado');
    } catch (error) {
      this.logger.error({ error }, 'Error baneando usuario');
      throw error;
    }
  }

  /**
   * Silenciar grupo (solo admins pueden enviar)
   */
  async muteGroup(groupJid: string): Promise<void> {
    await this.updateGroupSettings(groupJid, 'announcement');
  }

  /**
   * Desmutear grupo (todos pueden enviar)
   */
  async unmuteGroup(groupJid: string): Promise<void> {
    await this.updateGroupSettings(groupJid, 'not_announcement');
  }

  /**
   * Bloquear info del grupo (solo admins pueden editar info)
   */
  async lockGroupInfo(groupJid: string): Promise<void> {
    await this.updateGroupSettings(groupJid, 'locked');
  }

  /**
   * Desbloquear info del grupo (todos pueden editar info)
   */
  async unlockGroupInfo(groupJid: string): Promise<void> {
    await this.updateGroupSettings(groupJid, 'unlocked');
  }
}

export default GroupHandler;
