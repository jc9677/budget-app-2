This project is a standalone budget/expense tracker web app using React. It supports recurring transactions, and enables forecasting of account balances.
Stores all the user data in indexedDB.

The app should forecast the user's account balances (as many accounts as they want to add) based on their payday amount/schedule, and however many
expense categories they want to use.

Each expense and deposit should have configurable amount, frequency(day of month, day of week, biweekly, bimonthly, annually etc), start/end dates etc,
and the user should be able to edit individual occurances if they want to enter actual amount etc

Here are some categories that could be used, but there may be more:

Mortgage
Property taxes
Natural Gas
Electricity
Water
Pet food
Vet
Groceries
Coffee
Cell phone
Home maintenance
Home insurance
Car repair
Auto insurance
Fuel
Gifts
Internet
Clothing
Dining out / takeout
Online Subscriptions (e.g., TV/Movies, Music, Storage, AI...)
Lawn care / landscaping
Medical / dental expenses (co-pays, prescriptions, etc.)
Travel / vacations
Savings
Entertainment (movies, events, books, games)
Hobbies (craft supplies, music gear, etc.)
Charitable donations
Other/Miscellaneous



Haircuts / personal grooming
Gym membership or fitness classes
Health insurance premiums
Life insurance
Childcare or school tuition
School supplies / kids’ activities
House cleaning service
HOA fees
Parking / tolls

Loan payments (student, personal, etc.)
Business expenses (if self-employed)
Postage / shipping
Home security / alarm system
Banking fees
Legal / accounting services



## Project Setup & Technology Choices:
- **Build Tool:** Vite
- **UI Library:** Material UI

## Feature Clarifications:
- **Forecasting Display:** Account balance forecasts will initially be displayed in a table view.
- **Editing Recurring Transactions:** When editing an individual occurrence of a recurring transaction, the user will have the option to apply the change to only that single instance or to all future occurrences.
- **Income Configuration:** Users can add multiple income sources, each with its own configurable amount and schedule (e.g., primary salary on the 15th and 30th, freelance income on varying dates).