import { Migration } from '@mikro-orm/migrations';

export class Migration20230515194302 extends Migration {
    public override async up(): Promise<void> {
        this.addSql('alter table `mod_task` modify `label` text not null comment \'The task label, description, but I did not want to write description because I feel like it implies it has a title, and there is not title.\', modify `trigger_count` int not null default 1 comment \'How many times the trigger was triggered by the triggerer. Trigger? Is a trigger triggered by a trigger? That is weird.\';');
    }

    public override async down(): Promise<void> {
        this.addSql('alter table `mod_task` modify `label` varchar(255) not null comment \'The task label, description, but I did not want to write description because I feel like it implies it has a title, and there is not title.\', modify `trigger_count` int not null comment \'How many times the trigger was triggered by the triggerer. Trigger? Is a trigger triggered by a trigger? That is weird.\';');
    }
}
