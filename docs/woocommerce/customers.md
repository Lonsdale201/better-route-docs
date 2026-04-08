---
title: Customers
---

The Customers resource provides full CRUD for WooCommerce customers (WordPress users with WC data).

## Endpoints

| Method         | Path                    | Description        |
|----------------|-------------------------|--------------------|
| GET            | `/woo/customers`        | List customers     |
| GET            | `/woo/customers/{id}`   | Get customer       |
| POST           | `/woo/customers`        | Create customer    |
| PUT / PATCH    | `/woo/customers/{id}`   | Update customer    |
| DELETE         | `/woo/customers/{id}`   | Delete customer    |

## List query parameters

| Parameter | Type           | Default              | Description                        |
|-----------|----------------|----------------------|------------------------------------|
| `fields`  | string         | default set          | Comma-separated field names        |
| `role`    | string\|array  | —                    | Filter by role (comma-separated)   |
| `email`   | string         | —                    | Exact email match                  |
| `search`  | string         | —                    | Wildcard search on display name    |
| `sort`    | string         | `-registered_date`   | Sort field, prefix `-` for DESC    |
| `page`    | int            | 1                    | Page number                        |
| `per_page`| int            | 20                   | Items per page (max 100)           |

Allowed sort fields: `registered_date`, `id`, `email`, `display_name`

## Available fields

**List defaults:** id, email, first_name, last_name, display_name, role, date_created, orders_count, total_spent

**All fields:** id, email, first_name, last_name, display_name, role, username, date_created, date_modified, billing, shipping, is_paying_customer, avatar_url, orders_count, total_spent, meta_data

## Create / Update payload

```json
{
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "username": "janedoe",
  "password": "securepassword123",
  "billing": {
    "first_name": "Jane",
    "last_name": "Doe",
    "address_1": "456 Oak Ave",
    "city": "Portland",
    "state": "OR",
    "postcode": "97201",
    "country": "US",
    "email": "jane@example.com",
    "phone": "+1234567890"
  },
  "shipping": { },
  "meta_data": [
    { "key": "preferred_language", "value": "en" }
  ]
}
```

## Notes

- `email` is required on create and must be unique.
- `username` is create-only. It cannot be changed after creation.
- `password` is write-only. It is never returned in responses.
- Address fields (billing/shipping): first_name, last_name, company, address_1, address_2, city, state, postcode, country, email, phone.
- Delete uses `wp_delete_user()` and permanently removes the WordPress user.
