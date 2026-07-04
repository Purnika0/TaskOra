from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_alter_notification_notif_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notif_type',
            field=models.CharField(choices=[('new_assignment', 'New Assignment'), ('submission_approved', 'Submission Approved'), ('submission_rejected', 'Submission Rejected'), ('deadline_reminder', 'Deadline Reminder'), ('assignment_overdue', 'Assignment Overdue'), ('new_submission', 'New Submission')], max_length=30),
        ),
    ]
