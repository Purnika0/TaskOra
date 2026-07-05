from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0006_alter_task_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='assignment',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='assignments/'),
        ),
    ]