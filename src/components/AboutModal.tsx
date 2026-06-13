'use client';

import Modal from './Modal';
import AboutContent from './AboutContent';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Sidebar "About" re-open — reuses the shared AboutContent. */
export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Scout" maxWidth="max-w-4xl">
      <AboutContent />
    </Modal>
  );
}
