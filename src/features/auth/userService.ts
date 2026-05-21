/**
 * User Service
 * 
 * Servicio para manejar operaciones CRUD de perfiles de usuario en Firestore.
 * Incluye creación, lectura, actualización y gestión de fotos de perfil.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@lib/firebase/firebaseApp';
import type { UserProfile } from './types';
import { validateImageUri } from '@utils/imageHelpers';

/**
 * Datos para crear un nuevo usuario
 */
export interface CreateUserData {
    email: string;
    displayName?: string;
    photoURL?: string;
}

/**
 * Datos para actualizar un usuario
 */
export interface UpdateUserData {
    displayName?: string;
    photoURL?: string;
    bio?: string;
}

/**
 * Crea un documento de usuario en Firestore después del registro
 * 
 * @param uid - ID del usuario de Firebase Auth
 * @param data - Datos iniciales del usuario
 */
export async function createUserDocument(
    uid: string,
    data: CreateUserData
): Promise<void> {
    const userRef = doc(db, 'users', uid);

    const userData: Omit<UserProfile, 'uid'> = {
        email: data.email,
        displayName: data.displayName || null,
        photoURL: validateImageUri(data.photoURL) || null, // ✅ Sanitizado
        bio: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        diaryEntriesCount: 0,
        lastActive: new Date().toISOString(),
    };

    await setDoc(userRef, userData);
}

/**
 * Obtiene el perfil completo de un usuario desde Firestore
 * 
 * @param uid - ID del usuario
 * @returns Perfil del usuario
 * @throws Error si el usuario no existe
 */
export async function getUserProfile(uid: string): Promise<UserProfile> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error(`User profile not found for uid: ${uid}`);
    }

    const data = userSnap.data();

    return {
        uid,
        email: data.email,
        displayName: data.displayName || null,
        photoURL: validateImageUri(data.photoURL), // ✅ Sanitizado
        bio: data.bio || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        diaryEntriesCount: data.diaryEntriesCount || 0,
        lastActive: data.lastActive,
    };
}

/**
 * Garantiza que exista el documento de perfil. Si no existe, lo crea y retorna el perfil.
 * Evita lanzar excepciones de "not found" en flujos normales de login.
 */
export async function ensureUserProfile(
    uid: string,
    data: CreateUserData
): Promise<UserProfile> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await createUserDocument(uid, data);
        const createdSnap = await getDoc(userRef);
        const d = createdSnap.data()!;
        return {
            uid,
            email: d.email,
            displayName: d.displayName || null,
            photoURL: validateImageUri(d.photoURL), // ✅ Sanitizado
            bio: d.bio || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            diaryEntriesCount: d.diaryEntriesCount || 0,
            lastActive: d.lastActive,
        };
    }
    const d = snap.data()!;
    return {
        uid,
        email: d.email,
        displayName: d.displayName || null,
        photoURL: validateImageUri(d.photoURL), // ✅ Sanitizado
        bio: d.bio || null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        diaryEntriesCount: d.diaryEntriesCount || 0,
        lastActive: d.lastActive,
    };
}

/**
 * Actualiza el perfil de un usuario en Firestore
 * 
 * @param uid - ID del usuario
 * @param updates - Datos a actualizar
 */
export async function updateUserProfile(
    uid: string,
    updates: UpdateUserData
): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Actualiza la última actividad del usuario
 * 
 * @param uid - ID del usuario
 */
export async function updateLastActive(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
        lastActive: new Date().toISOString(),
    });
}

/**
 * Sube una foto de perfil a Firebase Storage y retorna la URL
 * 
 * @param uid - ID del usuario
 * @param imageUri - URI local de la imagen
 * @returns URL de descarga de la imagen subida
 */
export async function uploadProfilePicture(
    uid: string,
    imageUri: string
): Promise<string> {
    // Convertir URI a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Referencia al archivo en Storage
    const timestamp = Date.now();
    const fileRef = ref(storage, `users/${uid}/profile/avatar_${timestamp}.jpg`);

    // Subir archivo
    await uploadBytes(fileRef, blob);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(fileRef);

    // Actualizar perfil con nueva URL
    await updateUserProfile(uid, { photoURL: downloadURL });

    return downloadURL;
}

/**
 * Incrementa el contador de entradas del diario
 * 
 * @param uid - ID del usuario
 */
export async function incrementDiaryEntriesCount(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return;
    }

    const currentCount = userSnap.data().diaryEntriesCount || 0;

    await updateDoc(userRef, {
        diaryEntriesCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Decrementa el contador de entradas del diario
 * 
 * @param uid - ID del usuario
 */
export async function decrementDiaryEntriesCount(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return;
    }

    const currentCount = userSnap.data().diaryEntriesCount || 0;

    await updateDoc(userRef, {
        diaryEntriesCount: Math.max(0, currentCount - 1),
        updatedAt: new Date().toISOString(),
    });
}
