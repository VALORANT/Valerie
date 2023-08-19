import { Migration } from '@mikro-orm/migrations';

export class Migration20230514210602 extends Migration {
    public override async up(): Promise<void> {
        this.addSql('alter table `mod_task` add `trigger_count` int not null comment \'How many times the trigger was triggered by the triggerer. Trigger? Is a trigger triggered by a trigger? That is weird.\', add `message_id` varchar(255) not null comment \'Message id. Ok yeah that does not explain much, sorry. The mod task in question is going to be posted in a message. We are talking about that message, here. This is the id of that message. Got it?\';');
    }

    public override async down(): Promise<void> {
        this.addSql('alter table `mod_task` drop `trigger_count`;');
        this.addSql('alter table `mod_task` drop `message_id`;');
    }
}
