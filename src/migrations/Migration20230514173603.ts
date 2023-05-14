import { Migration } from '@mikro-orm/migrations';

export class Migration20230514173603 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `mod_task` (`id` int unsigned not null auto_increment primary key comment \'Primary key, not sure what to say here.\', `guild` varchar(255) not null comment \'Guild id, or server id, but in the coding realm servers are called guilds, leave me alone.\', `label` varchar(255) not null comment \'The task label, description, but I did not want to write description because I feel like it implies it has a title, and there is not title.\', `interval` varchar(255) not null comment \'The amount of time between each reminder.\', `last_trigger` datetime null comment \'The datetime of the last trigger.\') default character set utf8mb4 engine = InnoDB;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `mod_task`;');
  }

}
