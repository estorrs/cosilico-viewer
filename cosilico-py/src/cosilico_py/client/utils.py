import json

def insert_to_table(supabase_client, table_name, obj):
    # upload experiment
    body = json.loads(obj.model_dump_json(exclude={'local_path'}))
    response = (
        supabase_client.table(table_name)
        .insert(body)
        .execute()
    )

    return response