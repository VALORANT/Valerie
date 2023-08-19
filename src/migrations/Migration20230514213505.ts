import { Migration } from '@mikro-orm/migrations';

export class Migration20230514213505 extends Migration {
    public override async up(): Promise<void> {
        this.addSql('alter table `mod_task` modify `message_id` varchar(255) null comment \'Message id. Ok yeah that does not explain much, sorry. The mod task in question is going to be posted in a message. We are talking about that message, here. This is the id of that message. Got it?\';');
    }

    public override async down(): Promise<void> {
        this.addSql('alter table `mod_task` modify `message_id` varchar(255) not null comment \'Message id. Ok yeah that does not explain much, sorry. The mod task in question is going to be posted in a message. We are talking about that message, here. This is the id of that message. Got it?\';');
    }
}
