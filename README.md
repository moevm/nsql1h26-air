# nosql_template


## Предварительная проверка заданий

<a href=" ./../../../actions/workflows/1_helloworld.yml" >![1. Согласована и сформулирована тема курсовой]( ./../../actions/workflows/1_helloworld.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/2_usecase.yml" >![2. Usecase]( ./../../actions/workflows/2_usecase.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/3_data_model.yml" >![3. Модель данных]( ./../../actions/workflows/3_data_model.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/4_prototype_store_and_view.yml" >![4. Прототип хранение и представление]( ./../../actions/workflows/4_prototype_store_and_view.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/5_prototype_analysis.yml" >![5. Прототип анализ]( ./../../actions/workflows/5_prototype_analysis.yml/badge.svg)</a> 

<a href=" ./../../../actions/workflows/6_report.yml" >![6. Пояснительная записка]( ./../../actions/workflows/6_report.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/7_app_is_ready.yml" >![7. App is ready]( ./../../actions/workflows/7_app_is_ready.yml/badge.svg)</a>





## Installation & Running

1. Clone the repository:
   ```bash
   git clone <https://github.com/moevm/nsql1h26-air.git)>
   cd nsql1h26-air
   ```

2. Build and start the application:
   ```bash
   docker compose build --no-cache && docker compose up
   ```

3. Access the application:
   - Web Interface: http://localhost:5173
   - API: http://localhost:3001

## Test Accounts

The application comes pre-loaded with test data including the following accounts:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`

### User Accounts
- **Username**: `john_doe` | **Password**: `user123`
- **Username**: `jane_smith` | **Password**: `user123`
