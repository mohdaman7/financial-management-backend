import { UserModel, IUser } from '../models/User.model';

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).populate('roleId').exec();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).populate('roleId').exec();
  }

  async findByRefreshToken(token: string): Promise<IUser | null> {
    return UserModel.findOne({ refreshToken: token }).populate('roleId').exec();
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, data, { new: true }).populate('roleId').exec();
  }

  async delete(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(id).exec();
  }

  async findEmployeesByCompany(companyId: string): Promise<IUser[]> {
    return UserModel.find({ companyId, isSuperAdmin: false }).populate('roleId').exec();
  }

  async countSuperAdmins(): Promise<number> {
    return UserModel.countDocuments({ isSuperAdmin: true }).exec();
  }
}
