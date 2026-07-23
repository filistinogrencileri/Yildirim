import { Module } from '@nestjs/common';
import { AdminListsController } from './admin-lists.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [AdminUsersController, AdminListsController],
})
export class AdminModule {}
