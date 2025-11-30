import { supabase } from '../supabase';

export interface Notification {
    id: string;
    user_id: string;
    type: 'party_invite' | 'party_joined' | 'party_left' | 'party_started' | 'run_completed' | 'run_failed';
    title: string;
    message: string;
    data: any;
    read: boolean;
    created_at: string;
}

export async function sendNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            message,
            data,
        });

    if (error) {
        console.error('Error sending notification:', error);
        return false;
    }
    return true;
}

export async function getUserNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    let query = supabase
        .from<Notification>('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (unreadOnly) {
        query = query.eq('read', false);
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
    return (data as Notification[]) || [];
}

export async function markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
    return true;
}
