INSERT INTO users (tg_id,tg_name,tg_chat_id,tg_thread_id) VALUES
(1,"necklacex","-1002876070327",5),
(2,"necklacex","-1002876070327",7),
(3,"necklace","-1002876070327",21)
;

INSERT INTO user_strategies (user_id,strategy_type,symbol,period,params,is_active) VALUES
(1,"VolatilitySpike","*","5m",'{"volume": 0,"turnover": 20000000,"amplitudeMultiple": 5}',1),
(1,"ConsecutiveMove","*","1h",'{"count": 5,"turnover": 20000000}',1),
(1,"FundingRate","*","all",'{"fundingRate": 0.0005}',1)
;