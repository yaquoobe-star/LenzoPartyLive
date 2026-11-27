import React from 'react';
import { SuperAdminPanel } from '../admin/SuperAdminPanel';

interface AdminProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

/**
 * Unified Super Admin Panel entry wrapper preserving all existing admin triggers
 * across HomeScreen, ProfileScreen, SettingsScreen, and LevelAndVIPModal.
 */
export const AdminProgressionModal: React.FC<AdminProgressionModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  return (
    <SuperAdminPanel
      isOpen={isOpen}
      onClose={onClose}
      currentUserEmail={currentUserEmail}
    />
  );
};
