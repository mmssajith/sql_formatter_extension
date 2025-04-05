SELECT  *  FROM  users WHERE   user_id =  1
JOIN  orders ON   users.id = orders.user_id GROUP   BY  users.name
ORDER BY   users.created_at DESC   LIMIT 10;
