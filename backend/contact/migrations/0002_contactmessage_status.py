from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contact', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contactmessage',
            name='status',
            field=models.CharField(
                choices=[('NEW', 'New'), ('READ', 'Read'), ('RESOLVED', 'Resolved')],
                default='NEW',
                max_length=10,
            ),
        ),
    ]