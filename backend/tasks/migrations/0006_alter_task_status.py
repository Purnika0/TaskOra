from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0005_remove_subtask_task_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('submitted', 'Submitted'), ('completed', 'Completed'), ('overdue', 'Overdue'), ('rejected', 'Rejected')], default='pending', max_length=20),
        ),
    ]