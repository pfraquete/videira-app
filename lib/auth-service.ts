import { supabase, UserRole, DashboardUserRole, UserProfile } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: DashboardUserRole;
  profile?: UserProfile;
}

export class AuthService {
  /**
   * Login com email e senha
   */
  static async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar perfil e role
    const profile = await this.getProfile(data.user.id);
    const role = await this.getUserRole(data.user.id);

    return {
      id: data.user.id,
      email: data.user.email || '',
      role,
      profile: profile || undefined,
    };
  }

  /**
   * Cadastro de novo usuário
   */
  static async signUp(email: string, password: string, nomeCompleto: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Erro ao criar usuário');
    }

    // Criar perfil
    await this.createProfile(data.user.id, nomeCompleto);

    // Criar role inicial
    await this.createUserRole(data.user.id);

    return {
      id: data.user.id,
      email: data.user.email || '',
      role: 'participante',
    };
  }

  /**
   * Logout
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Obter sessão atual
   */
  static async getSession(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const profile = await this.getProfile(session.user.id);
    const role = await this.getUserRole(session.user.id);

    return {
      id: session.user.id,
      email: session.user.email || '',
      role,
      profile: profile || undefined,
    };
  }

  /**
   * Buscar perfil do usuário
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  }

  /**
   * Criar perfil do usuário
   */
  static async createProfile(userId: string, nomeCompleto: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        nome_completo: nomeCompleto,
      });

    if (error) {
      console.error('Error creating profile:', error);
    }
  }

  /**
   * Criar role inicial do usuário
   */
  static async createUserRole(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: UserRole.PARTICIPANTE,
      });

    if (error) {
      console.error('Error creating user role:', error);
    }
  }

  /**
   * Obter role do usuário
   */
  static async getUserRole(userId: string): Promise<DashboardUserRole> {
    // 1. Verificar na tabela user_roles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData && 
        roleData.role !== UserRole.PARTICIPANTE && 
        roleData.role !== UserRole.FREQUENTADOR_ASSIDUO) {
      return this.mapUserRole(roleData.role as UserRole);
    }

    // 2. Verificar se é admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (adminData) return 'pastor'; // Admin tem acesso de pastor no app

    // 3. Verificar se é pastor
    const { data: pastorData } = await supabase
      .from('pastores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (pastorData) return 'pastor';

    // 4. Verificar se é discipulador
    const { data: discipuladorData } = await supabase
      .from('discipuladores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (discipuladorData) return 'discipulador';

    // 5. Verificar se é líder de célula
    const { data: cellData } = await supabase
      .from('cells')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (cellData) return 'lider';

    // 6. Padrão: participante
    return 'participante';
  }

  /**
   * Mapear UserRole para DashboardUserRole
   */
  private static mapUserRole(role: UserRole): DashboardUserRole {
    switch (role) {
      case UserRole.PASTOR:
      case UserRole.ADMIN:
        return 'pastor';
      case UserRole.DISCIPULADOR:
        return 'discipulador';
      case UserRole.LIDER_CELULA:
        return 'lider';
      default:
        return 'participante';
    }
  }
}
