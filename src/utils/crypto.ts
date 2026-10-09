// Computes standard SHA-256 hash of a string
export const sha256 = async (message: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Pre-hashed values for Admin credentials.
 * Defaults configured:
 *   Default Password: "admin" -> sha256: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
 *   Default Secret Key: "key123" -> sha256: 28bc9447492c815254b35adba4470bc655ab9c34a22237072cfa9d6bfef78a53
 *
 * You can change your password/key by generating SHA-256 hashes online and replacing these strings.
 */
export const ADMIN_PASSWORD_HASH = '532f0cd6e914d07f1f713954ebf7985e36921fbb8cce6c06e6ea2208491d3c37';
export const ADMIN_KEY_HASH = '53a96f9a0aa56a143f72139b107e4f7672a697ba937430df606556ed4072309b';