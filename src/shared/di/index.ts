import { Container } from './container';
import { UserRepository } from '@modules/auth/infrastructure/repositories/user.repository';
import { RoleRepository } from '@modules/auth/infrastructure/repositories/role.repository';
import { CompanyRepository } from '@modules/company/infrastructure/repositories/company.repository';
import { AuthService } from '@modules/auth/application/services/auth.service';
import { UserService } from '@modules/auth/application/services/user.service';
import { RoleService } from '@modules/auth/application/services/role.service';

export function initializeContainer(): void {
  // Clear any existing registrations (helps during testing)
  Container.clear();

  // Repositories
  const userRepository = new UserRepository();
  const roleRepository = new RoleRepository();
  const companyRepository = new CompanyRepository();

  Container.register('UserRepository', userRepository);
  Container.register('RoleRepository', roleRepository);
  Container.register('CompanyRepository', companyRepository);

  // Services
  const authService = new AuthService(userRepository, companyRepository);
  const userService = new UserService(userRepository);
  const roleService = new RoleService(roleRepository);

  Container.register('AuthService', authService);
  Container.register('UserService', userService);
  Container.register('RoleService', roleService);
}
export { Container };
