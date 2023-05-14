import { Migration } from '@mikro-orm/migrations';

export class Migration20230512200255 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `settings` (`key` varchar(255) not null comment \'The key of the setting, snake case\', `guild` varchar(255) not null comment \'The guild snowflake in which this setting applies\', `value` varchar(255) not null comment \'The value of the setting\', primary key (`key`, `guild`)) default character set utf8mb4 engine = InnoDB;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `settings`;');
  }

}
