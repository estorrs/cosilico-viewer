<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { formSchema, type FormSchema } from './schema';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import Button from '$lib/components/ui/button/button.svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';

	let { data } = $props();

	const form = superForm(data.form, {
		validators: zodClient(formSchema),
		delayMs: 500,
		timeoutMs: 8000
	});

	const { form: formData, enhance, submitting, delayed, timeout, errors, message } = form;
</script>

<div class="flex-1">
	<a href="/">home</a>
	<a href="/create-user">create user</a>
	<a href="/get-user">get user</a>
	<a href="/login">login</a>
</div>

<Card.Root class="w-96 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
	<Card.Header>
		<Card.Title>Login</Card.Title>
		<Card.Description>Sign in to your user portal.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Email</Form.Label>
						<Input {...props} bind:value={$formData.email} />
					{/snippet}
				</Form.Control>
				<!-- <Form.Description>This is your email.</Form.Description> -->
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Password</Form.Label>
						<Input {...props} bind:value={$formData.password} type="password" />
					{/snippet}
				</Form.Control>
				<!-- <Form.Description>This is your password.</Form.Description> -->
				<Form.FieldErrors />
			</Form.Field>

			{#if !$submitting && !$delayed && !$timeout}
				<Form.Button>Submit</Form.Button>
			{/if}
			{#if $submitting || $delayed || $timeout}
				<Button disabled>
					<LoaderCircleIcon class="animate-spin" />
					Sign in
				</Button>
			{/if}
			{#if $message}
				<Alert.Root variant="destructive" class="top-2">
					<CircleAlertIcon class="size-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{$message}</Alert.Description>
				</Alert.Root>
			{/if}
		</form>
	</Card.Content>
</Card.Root>
