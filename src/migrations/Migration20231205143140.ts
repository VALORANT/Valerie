import { Migration } from '@mikro-orm/migrations';

export class Migration20231205143140 extends Migration {
    public override async up(): Promise<void> {
        this.addSql('create table `whitelisted_user` (`user_id` varchar(255) not null comment \'Discord snowflake of the user\', `guild_id` varchar(255) not null comment \'Guild snowflake, or server id, but in the coding realm servers are called guilds, and ids are snowflakes, but only sometimes, leave me alone.\', `whitelisted_by` text not null comment \'Discord snowflake of the user who created this entry\', `created_on` datetime null comment \'The datetime of when the entry was created.\', primary key (`user_id`, `guild_id`)) default character set utf8mb4 engine = InnoDB;');
    }

    public override async down(): Promise<void> {
        this.addSql('drop table if exists `whitelisted_user`;');
    }
}
