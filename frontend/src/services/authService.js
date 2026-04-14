import { supabase } from '../lib/supabase';

// Supabase Authentication Service
const authService = {
    // Register new user
    register: async (fullName, email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) throw error;

        // Return in format compatible with existing code
        return {
            success: true,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                fullName: data.user?.user_metadata?.full_name,
            },
            token: data.session?.access_token,
        };
    },

    // Login user
    login: async (email, password, rememberMe = false) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Store session preference
        if (rememberMe) {
            localStorage.setItem('supabase.auth.persist', 'true');
        } else {
            sessionStorage.setItem('supabase.auth.persist', 'false');
        }

        // Return in format compatible with existing code
        return {
            success: true,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                fullName: data.user?.user_metadata?.full_name,
            },
            token: data.session?.access_token,
        };
    },

    // Logout user
    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('supabase.auth.persist');
        sessionStorage.removeItem('supabase.auth.persist');
    },

    // Get current user from Supabase session
    getCurrentUser: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!session) throw new Error('No active session');

        return {
            success: true,
            user: {
                id: session.user?.id,
                email: session.user?.email,
                fullName: session.user?.user_metadata?.full_name,
            },
        };
    },

    // Update user profile
    updateProfile: async (updates) => {
        const { data, error } = await supabase.auth.updateUser({
            data: {
                full_name: updates.fullName || updates.full_name,
            }
        });

        if (error) throw error;

        return {
            success: true,
            user: {
                id: data.user?.id,
                email: data.user?.email,
                fullName: data.user?.user_metadata?.full_name,
            },
        };
    },

    // Get stored token (from Supabase session)
    getToken: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    },

    // Get stored user (from Supabase session)
    getStoredUser: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        return {
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name,
        };
    },
};

export default authService;
