export type TeamMember = { user_id: string; email: string; role: 'owner' | 'member' };
export type IncomingInvitation = { id: string; organization_name: string; expires_at: string };
export function assigneeLabel(row: { assignee_id?: string | null; owner_name?: string }, members: TeamMember[]) {
 return members.find(m => m.user_id === row.assignee_id)?.email || row.owner_name || 'Sem responsável';
}
