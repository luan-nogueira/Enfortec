CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`discountPercentage` decimal(5,2) NOT NULL,
	`maxUses` int,
	`usedCount` int DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `digitalProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`type` enum('jogo','gift_card','licenca','outro') NOT NULL,
	`keyOrCode` text,
	`downloadUrl` varchar(500),
	`stock` int NOT NULL DEFAULT 1,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digitalProducts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`orderId` int,
	`content` text NOT NULL,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerId` int NOT NULL,
	`sellerId` int,
	`productId` int,
	`usedProductId` int,
	`digitalProductId` int,
	`productType` enum('store','used','digital') NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`totalPrice` decimal(10,2) NOT NULL,
	`commissionPercentage` decimal(5,2) NOT NULL,
	`platformCommission` decimal(10,2) NOT NULL,
	`sellerAmount` decimal(10,2) NOT NULL,
	`status` enum('pendente','pago','enviado','entregue','cancelado') DEFAULT 'pendente',
	`paymentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`images` json DEFAULT (JSON_ARRAY()),
	`isActive` boolean DEFAULT true,
	`mercadoLibreId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`sellerId` int NOT NULL,
	`buyerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeName` varchar(255) NOT NULL,
	`description` text,
	`rating` decimal(3,2) DEFAULT '0',
	`totalReviews` int DEFAULT 0,
	`commissionPercentage` decimal(5,2) DEFAULT '10',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sellers_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `usedProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`condition` enum('novo','como_novo','bom','aceitavel') NOT NULL,
	`images` json DEFAULT (JSON_ARRAY()),
	`status` enum('pendente','aprovado','rejeitado','vendido') DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usedProducts_id` PRIMARY KEY(`id`)
);
