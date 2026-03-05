export interface AppUser {

  uid: string;
  email: string;

  clinicId: string;

  role: 'owner' | 'admin' | 'professional';

  name?: string;

}