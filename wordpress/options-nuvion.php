<?php
/**
 * "Dados da Nuvion" — a Settings API page for everything that is not a post: company facts, contact and social links,
 * the founder, the portfolio results and the About page texts. Same three pieces as the starter's options-example.php
 * (Settings API page in tabs → sanitize callback → GET /wp-json/site/v1/options), but driven by ONE schema array
 * (site_opt_schema) that renders the form, sanitizes each value by its type and feeds the REST output, so adding a field
 * is one line.
 *
 * The defaults in the schema are the values that were hard-coded in the front-end (src/lib/contact.ts, results.ts and
 * pages/sobre-nos.astro) — so a fresh install already shows the current site, and the front-end keeps the same values
 * as an offline fallback.
 *
 * Capability: manage_site_options (editor-role.php grants it to Editors; Administrators get it at runtime).
 * Saving goes through site_request_deploy() (auto-deploy.php): it marks the site "unsent changes" (manual mode).
 *
 * Usage: drop into wp-content/mu-plugins/. Needs 00-site-helpers.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const SITE_OPT = 'site_options';

/** Schema: tab → sections → fields. Field types: text, url, email, number, textarea, image (attachment id), select. */
function site_opt_schema() {
	$viz = array(
		'line'  => 'Linha crescente',
		'bars'  => 'Barras',
		'dots'  => 'Pontos',
		'rings' => 'Anéis',
	);

	$result_defaults = array(
		array( 'Leads gerados', 1.2, 1, '+', 'M', 'line' ),
		array( 'Visualizações de página', 8.4, 1, '', 'M', 'bars' ),
		array( 'Impressões no Google', 32, 0, '', 'M', 'dots' ),
		array( 'CTR médio nas buscas orgânicas', 4.8, 1, '', '%', 'rings' ),
	);
	$result_fields   = array();
	foreach ( $result_defaults as $i => $d ) {
		$n                                     = $i + 1;
		$result_fields[ "results_{$n}_label" ]    = array( 'type' => 'text', 'label' => "Número {$n} · Descrição", 'default' => $d[0] );
		$result_fields[ "results_{$n}_count" ]    = array( 'type' => 'number', 'label' => "Número {$n} · Valor", 'default' => $d[1], 'desc' => 'Já na unidade do sufixo: 1,2 com sufixo "M" = 1,2 milhão.' );
		$result_fields[ "results_{$n}_decimals" ] = array( 'type' => 'select', 'label' => "Número {$n} · Casas decimais", 'default' => (string) $d[2], 'options' => array( '0' => '0', '1' => '1', '2' => '2' ) );
		$result_fields[ "results_{$n}_prefix" ]   = array( 'type' => 'text', 'label' => "Número {$n} · Antes do número", 'default' => $d[3], 'desc' => 'Ex.: +' );
		$result_fields[ "results_{$n}_suffix" ]   = array( 'type' => 'text', 'label' => "Número {$n} · Depois do número", 'default' => $d[4], 'desc' => 'Ex.: M, %, mil' );
		$result_fields[ "results_{$n}_viz" ]      = array( 'type' => 'select', 'label' => "Número {$n} · Desenho animado", 'default' => $d[5], 'options' => $viz );
	}

	return array(
		'empresa'   => array(
			'label'    => 'Empresa',
			'sections' => array(
				array(
					'title'  => 'Identidade',
					'fields' => array(
						'company_brand'       => array( 'type' => 'text', 'label' => 'Nome comercial', 'default' => 'Agência Nuvion' ),
						'company_shortName'   => array( 'type' => 'text', 'label' => 'Nome curto', 'default' => 'Nuvion' ),
						'company_legalName'   => array( 'type' => 'text', 'label' => 'Razão social', 'default' => 'Nuvion Marketing, Estratégia e Treinamentos LTDA' ),
						'company_cnpj'        => array( 'type' => 'text', 'label' => 'CNPJ', 'default' => '32.024.972/0001-02' ),
						'company_foundingYear' => array( 'type' => 'text', 'label' => 'Ano de fundação', 'default' => '2015' ),
						'company_logo'        => array( 'type' => 'image', 'label' => 'Logo (perfil)', 'default' => 0, 'desc' => 'Usada nos dados estruturados (schema.org). Quadrada, PNG ou WebP.' ),
					),
				),
				array(
					'title'  => 'Endereço e horário',
					'fields' => array(
						'company_city'   => array( 'type' => 'text', 'label' => 'Cidade', 'default' => 'Palhoça' ),
						'company_region' => array( 'type' => 'text', 'label' => 'Estado (sigla)', 'default' => 'SC' ),
						'company_metro'  => array( 'type' => 'text', 'label' => 'Região', 'default' => 'Grande Florianópolis' ),
						'company_hours'  => array( 'type' => 'text', 'label' => 'Horário de atendimento', 'default' => 'Segunda a sexta, das 9h às 18h' ),
						'company_mapsUrl' => array( 'type' => 'url', 'label' => 'Link do Google Maps', 'default' => 'https://maps.app.goo.gl/HgqUt2RxZ1KC1kch8', 'desc' => 'Perfil da empresa no Google.' ),
					),
				),
			),
		),
		'contato'   => array(
			'label'    => 'Contato e redes',
			'sections' => array(
				array(
					'title'  => 'Contato',
					'fields' => array(
						'contact_whatsapp'        => array( 'type' => 'text', 'label' => 'WhatsApp (só números, com 55 e DDD)', 'default' => '5548996964116', 'desc' => 'Todos os botões do site abrem este número. Não aparece escrito nas páginas.' ),
						'contact_whatsappDisplay' => array( 'type' => 'text', 'label' => 'WhatsApp (como exibir)', 'default' => '(48) 9 9696-4116' ),
						'contact_phoneIntl'       => array( 'type' => 'text', 'label' => 'Telefone internacional', 'default' => '+55 48 99696-4116', 'desc' => 'Vai para os dados estruturados e para as páginas legais.' ),
						'contact_email'           => array( 'type' => 'email', 'label' => 'E-mail', 'default' => 'mkt@agencianuvion.com.br', 'desc' => 'Vai para os dados estruturados e para as páginas legais. Não aparece nas outras páginas.' ),
						'contact_location'        => array( 'type' => 'text', 'label' => 'Localização', 'default' => 'Grande Florianópolis' ),
					),
				),
				array(
					'title'  => 'Redes sociais',
					'fields' => array(
						'contact_instagram' => array( 'type' => 'url', 'label' => 'Instagram', 'default' => 'https://instagram.com/nuvion.agencia' ),
						'contact_facebook'  => array( 'type' => 'url', 'label' => 'Facebook', 'default' => 'https://facebook.com/nuvion.agencia' ),
						'contact_linkedin'  => array( 'type' => 'url', 'label' => 'LinkedIn da empresa', 'default' => 'https://linkedin.com/company/nuvionagencia/' ),
					),
				),
			),
		),
		'fundador'  => array(
			'label'    => 'Fundador',
			'sections' => array(
				array(
					'title'  => 'Juan Carlo',
					'fields' => array(
						'founder_name'      => array( 'type' => 'text', 'label' => 'Nome completo', 'default' => 'Juan Carlo Fabra Gomez' ),
						'founder_shortName' => array( 'type' => 'text', 'label' => 'Nome curto', 'default' => 'Juan C. Fabra Gomez' ),
						'founder_role'      => array( 'type' => 'text', 'label' => 'Cargo', 'default' => 'Diretor e CMO da Agência Nuvion' ),
						'founder_linkedin'  => array( 'type' => 'url', 'label' => 'LinkedIn', 'default' => 'https://br.linkedin.com/in/fabragomez' ),
						'founder_education' => array( 'type' => 'text', 'label' => 'Formação', 'default' => 'Formação superior em Administração e Marketing Digital' ),
						'founder_photo'     => array( 'type' => 'image', 'label' => 'Foto', 'default' => 0, 'desc' => 'Vazia, o site usa a foto que já está nele.' ),
						'founder_bio'       => array( 'type' => 'textarea', 'label' => 'Mini biografia', 'default' => 'Juan Carlo Fabra Gomez é diretor da Agência Nuvion, desenvolvedor web full-stack e especialista em SEO e GEO. Com forte atuação em UI/UX design e integração de inteligência artificial, ele foca em impulsionar o posicionamento digital de marcas através de arquitetura de conteúdo e engenharia de performance.' ),
						'founder_quote'     => array( 'type' => 'textarea', 'label' => 'Citação do fundador (Sobre Nós)', 'default' => '', 'desc' => 'Vazia, o site usa o texto que já está nele. Escreva com a sua voz.' ),
					),
				),
			),
		),
		'resultados' => array(
			'label'    => 'Resultados',
			'sections' => array(
				array(
					'title'  => 'Portfólio · "Resultados que a gente soma"',
					'fields' => array_merge(
						array(
							'results_source' => array( 'type' => 'textarea', 'label' => 'Linha de fonte (texto pequeno abaixo)', 'default' => 'Somatório dos projetos, 2015 a 2026 (números de teste). Fonte: painéis dos clientes (Google Analytics, Search Console e CRM).', 'desc' => 'Período e origem dos números. Troque quando os números forem os reais.' ),
						),
						$result_fields
					),
				),
			),
		),
		'sobre'     => array(
			'label'    => 'Sobre Nós',
			'sections' => array(
				array(
					'title'  => 'Números do topo',
					'fields' => array(
						'about_years'    => array( 'type' => 'number', 'label' => 'Anos de experiência', 'default' => 11 ),
						'about_projects' => array( 'type' => 'number', 'label' => 'Projetos entregues (aparece como +N)', 'default' => 150 ),
						'about_leadsK'   => array( 'type' => 'number', 'label' => 'Leads gerados, em milhares', 'default' => 1000, 'desc' => '1000 aparece como "1M+".' ),
						'about_place'    => array( 'type' => 'text', 'label' => 'Cartão de alcance · título', 'default' => 'Atendemos todo o Brasil' ),
						'about_placeSub' => array( 'type' => 'text', 'label' => 'Cartão de alcance · subtítulo', 'default' => 'Empresas de qualquer estado' ),
					),
				),
				array(
					'title'  => 'Missão e visão',
					'fields' => array(
						'about_mission_title' => array( 'type' => 'text', 'label' => 'Missão · título', 'default' => 'Simplificar o crescimento digital' ),
						'about_mission_text'  => array( 'type' => 'textarea', 'label' => 'Missão · texto', 'default' => 'Simplificar o crescimento digital das empresas que atendemos, construindo sites que funcionam como ativos de aquisição, não só cartões de visita.' ),
						'about_vision_title'  => array( 'type' => 'text', 'label' => 'Visão · título', 'default' => 'A referência em SEO técnico e GEO' ),
						'about_vision_text'   => array( 'type' => 'textarea', 'label' => 'Visão · texto', 'default' => 'Ser a principal referência em arquitetura digital para SEO técnico e GEO, reconhecida por transformar a presença online dos nossos clientes em um ativo previsível.' ),
					),
				),
				array(
					'title'  => 'Valores',
					'fields' => array(
						'about_value1_title' => array( 'type' => 'text', 'label' => 'Valor 1 · título', 'default' => 'Foco no resultado' ),
						'about_value1_text'  => array( 'type' => 'textarea', 'label' => 'Valor 1 · texto', 'default' => 'O seu retorno é a métrica que importa. Não trabalhamos por vaidade, trabalhamos por ROI.' ),
						'about_value2_title' => array( 'type' => 'text', 'label' => 'Valor 2 · título', 'default' => 'Transparência estratégica' ),
						'about_value2_text'  => array( 'type' => 'textarea', 'label' => 'Valor 2 · texto', 'default' => 'Dados claros, sem enrolação, para você tomar decisão com segurança.' ),
						'about_value3_title' => array( 'type' => 'text', 'label' => 'Valor 3 · título', 'default' => 'Expertise humana e tecnologia' ),
						'about_value3_text'  => array( 'type' => 'textarea', 'label' => 'Valor 3 · texto', 'default' => 'Tecnologia sozinha não resolve. É a combinação com julgamento humano que faz a diferença.' ),
					),
				),
			),
		),
	);
}

/** Flat map key → field definition, for every field in the schema. */
function site_opt_fields() {
	static $flat = null;
	if ( null === $flat ) {
		$flat = array();
		foreach ( site_opt_schema() as $tab ) {
			foreach ( $tab['sections'] as $section ) {
				foreach ( $section['fields'] as $key => $def ) {
					$flat[ $key ] = $def;
				}
			}
		}
	}
	return $flat;
}

/** Saved values over the schema defaults (a key never saved reads as its default). */
function site_options() {
	$defaults = array();
	foreach ( site_opt_fields() as $key => $def ) {
		$defaults[ $key ] = $def['default'];
	}
	return wp_parse_args( (array) get_option( SITE_OPT, array() ), $defaults );
}

/* ----------------------------------------------------------------- *
 *  Menu + registration
 * ----------------------------------------------------------------- */

add_action(
	'admin_menu',
	function () {
		add_menu_page( 'Dados da Nuvion', 'Dados da Nuvion', 'manage_site_options', 'site-options', 'site_options_page', 'dashicons-building', 3 );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting( 'site_options_group', SITE_OPT, 'site_options_sanitize' );
	}
);

// options.php requires 'manage_options' by default on save — open it up to the same capability that grants the page.
add_filter(
	'option_page_capability_site_options_group',
	function () {
		return 'manage_site_options';
	}
);

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( 'toplevel_page_site-options' === $hook ) {
			wp_enqueue_media();
		}
	}
);

function site_options_sanitize( $input ) {
	$input = (array) $input;
	$out   = array();
	foreach ( site_opt_fields() as $key => $def ) {
		$raw = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : $def['default'];
		switch ( $def['type'] ) {
			case 'url':
				$out[ $key ] = esc_url_raw( trim( (string) $raw ) );
				break;
			case 'email':
				$out[ $key ] = sanitize_email( trim( (string) $raw ) );
				break;
			case 'number':
				$raw         = str_replace( ',', '.', trim( (string) $raw ) );
				$out[ $key ] = is_numeric( $raw ) ? (float) $raw + 0 : $def['default'];
				break;
			case 'textarea':
				$out[ $key ] = sanitize_textarea_field( (string) $raw );
				break;
			case 'image':
				$out[ $key ] = (int) $raw;
				break;
			case 'select':
				$out[ $key ] = array_key_exists( (string) $raw, $def['options'] ) ? (string) $raw : $def['default'];
				break;
			default:
				$out[ $key ] = sanitize_text_field( (string) $raw );
		}
	}
	// WhatsApp is used in a wa.me link: digits only.
	$out['contact_whatsapp'] = preg_replace( '/\D+/', '', (string) $out['contact_whatsapp'] );
	return $out;
}

/* ----------------------------------------------------------------- *
 *  Page
 * ----------------------------------------------------------------- */

function site_opt_render_field( $key, $def, $value ) {
	$name = SITE_OPT . '[' . $key . ']';
	$id   = 'site_opt_' . $key;
	echo '<tr><th scope="row"><label for="' . esc_attr( $id ) . '">' . esc_html( $def['label'] ) . '</label></th><td>';
	switch ( $def['type'] ) {
		case 'textarea':
			echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="4" class="large-text">' . esc_textarea( (string) $value ) . '</textarea>';
			break;
		case 'select':
			echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '">';
			foreach ( $def['options'] as $v => $label ) {
				echo '<option value="' . esc_attr( $v ) . '"' . selected( (string) $value, (string) $v, false ) . '>' . esc_html( $label ) . '</option>';
			}
			echo '</select>';
			break;
		case 'image':
			$thumb = $value ? wp_get_attachment_image_url( (int) $value, 'medium' ) : '';
			echo '<div class="site-img-field" data-input="' . esc_attr( $id ) . '">';
			echo '<input type="hidden" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (int) $value ) . '">';
			echo '<div class="site-img-prev">' . ( $thumb ? '<img src="' . esc_url( $thumb ) . '" alt="">' : '' ) . '</div>';
			echo '<button type="button" class="button site-img-pick">Escolher imagem</button> <button type="button" class="button-link site-img-clear">remover</button>';
			echo '</div>';
			break;
		default:
			$type = in_array( $def['type'], array( 'url', 'email', 'number' ), true ) ? $def['type'] : 'text';
			$step = 'number' === $type ? ' step="any"' : '';
			echo '<input type="' . esc_attr( $type ) . '"' . $step . ' id="' . esc_attr( $id ) . '" class="regular-text" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '">';
	}
	if ( ! empty( $def['desc'] ) ) {
		echo '<p class="description">' . esc_html( $def['desc'] ) . '</p>';
	}
	echo '</td></tr>';
}

function site_options_page() {
	$schema = site_opt_schema();
	$o      = site_options();
	$first  = true;
	?>
	<div class="wrap site-options">
		<h1>Dados da Nuvion</h1>
		<p class="description">Textos e números que aparecem em várias páginas do site. Depois de salvar, use o botão <strong>"Enviar alterações ao site"</strong> na barra lateral para publicar.</p>

		<form method="post" action="options.php">
			<?php settings_fields( 'site_options_group' ); ?>

			<h2 class="nav-tab-wrapper site-tabs">
				<?php foreach ( $schema as $slug => $tab ) : ?>
					<a href="#<?php echo esc_attr( $slug ); ?>" class="nav-tab<?php echo $first ? ' nav-tab-active' : ''; ?>" data-tab="<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( $tab['label'] ); ?></a>
					<?php $first = false; ?>
				<?php endforeach; ?>
			</h2>

			<?php $first = true; ?>
			<?php foreach ( $schema as $slug => $tab ) : ?>
				<section class="site-panel" data-panel="<?php echo esc_attr( $slug ); ?>"<?php echo $first ? '' : ' hidden'; ?>>
					<?php foreach ( $tab['sections'] as $section ) : ?>
						<h3><?php echo esc_html( $section['title'] ); ?></h3>
						<table class="form-table" role="presentation">
							<?php
							foreach ( $section['fields'] as $key => $def ) {
								site_opt_render_field( $key, $def, $o[ $key ] );
							}
							?>
						</table>
					<?php endforeach; ?>
				</section>
				<?php $first = false; ?>
			<?php endforeach; ?>

			<?php submit_button( 'Salvar' ); ?>
		</form>
	</div>

	<style>
		/* Uses the --site-* variables admin-branding.php defines; falls back to plain WordPress admin colors. */
		.site-options .site-tabs { margin-bottom: 0; }
		.site-options .nav-tab { font-weight: 500; background: var(--site-surface-2, #f6f7f7); border-color: var(--site-content-border, #c3c4c7); color: var(--site-content-text-muted, #646970); }
		.site-options .nav-tab-active, .site-options .nav-tab-active:focus, .site-options .nav-tab-active:hover { background: var(--site-surface, #fff); color: var(--site-accent, #2271b1); border-bottom-color: var(--site-surface, #fff); }
		.site-options .site-panel { background: var(--site-surface, #fff); border: 1px solid var(--site-content-border, #c3c4c7); border-top: 0; padding: 4px 20px 12px; }
		.site-options .site-panel h3 { margin: 22px 0 0; padding-bottom: 8px; border-bottom: 1px solid var(--site-content-border, #dcdcde); }
		.site-options .site-panel .form-table { margin-top: 0; }
		.site-options .form-table th { width: 260px; }
		.site-options .large-text { max-width: 640px; }
		.site-img-prev img { max-width: 220px; height: auto; display: block; margin-bottom: 8px; border: 1px solid #ccd0d4; }
	</style>

	<script>
	( function () {
		// Tabs — remembered per browser tab via sessionStorage, and via the URL hash.
		var KEY = 'site_options_tab';
		var tabs = document.querySelectorAll( '.site-tabs .nav-tab' );
		var panels = document.querySelectorAll( '.site-panel' );
		function activate( name ) {
			tabs.forEach( function ( t ) { t.classList.toggle( 'nav-tab-active', t.dataset.tab === name ); } );
			panels.forEach( function ( p ) { p.hidden = p.dataset.panel !== name; } );
			try { sessionStorage.setItem( KEY, name ); } catch ( e ) {}
		}
		tabs.forEach( function ( t ) {
			t.addEventListener( 'click', function ( e ) { e.preventDefault(); activate( t.dataset.tab ); } );
		} );
		var initial = ( location.hash || '' ).replace( '#', '' );
		try { initial = initial || sessionStorage.getItem( KEY ) || ''; } catch ( e ) {}
		if ( initial && document.querySelector( '.site-panel[data-panel="' + initial + '"]' ) ) { activate( initial ); }

		// Image pickers (any number of them on the page).
		document.querySelectorAll( '.site-img-field' ).forEach( function ( box ) {
			var input = document.getElementById( box.dataset.input );
			var prev = box.querySelector( '.site-img-prev' );
			box.querySelector( '.site-img-pick' ).addEventListener( 'click', function ( e ) {
				e.preventDefault();
				var frame = wp.media( { title: 'Escolher imagem', multiple: false, library: { type: 'image' } } );
				frame.on( 'select', function () {
					var a = frame.state().get( 'selection' ).first().toJSON();
					input.value = a.id;
					var u = ( a.sizes && a.sizes.medium ) ? a.sizes.medium.url : a.url;
					prev.innerHTML = '<img src="' + u + '" alt="">';
				} );
				frame.open();
			} );
			box.querySelector( '.site-img-clear' ).addEventListener( 'click', function ( e ) {
				e.preventDefault();
				input.value = '0';
				prev.innerHTML = '';
			} );
		} );
	} )();
	</script>
	<?php
}

/* ----------------------------------------------------------------- *
 *  REST — GET /wp-json/site/v1/options  (nested, ready for the front-end)
 * ----------------------------------------------------------------- */

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'site/v1',
			'/options',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => function () {
					$o = site_options();

					$pick = function ( $prefix, $keys ) use ( $o ) {
						$out = array();
						foreach ( $keys as $k ) {
							$out[ $k ] = $o[ $prefix . '_' . $k ];
						}
						return $out;
					};

					$company = $pick( 'company', array( 'brand', 'shortName', 'legalName', 'cnpj', 'foundingYear', 'city', 'region', 'metro', 'hours', 'mapsUrl' ) );
					$company['logoUrl'] = site_img_url( $o['company_logo'], 'large' ) ?: null;

					$founder          = $pick( 'founder', array( 'name', 'shortName', 'role', 'linkedin', 'education', 'bio', 'quote' ) );
					$founder['photo'] = site_img_url( $o['founder_photo'], 'large' ) ?: null;

					$items = array();
					for ( $n = 1; $n <= 4; $n++ ) {
						$items[] = array(
							'label'    => (string) $o[ "results_{$n}_label" ],
							'count'    => (float) $o[ "results_{$n}_count" ],
							'decimals' => (int) $o[ "results_{$n}_decimals" ],
							'prefix'   => (string) $o[ "results_{$n}_prefix" ],
							'suffix'   => (string) $o[ "results_{$n}_suffix" ],
							'viz'      => (string) $o[ "results_{$n}_viz" ],
						);
					}

					return array(
						'company' => $company,
						'contact' => $pick( 'contact', array( 'whatsapp', 'whatsappDisplay', 'phoneIntl', 'email', 'location', 'instagram', 'facebook', 'linkedin' ) ),
						'founder' => $founder,
						'results' => array( 'source' => (string) $o['results_source'], 'items' => $items ),
						'about'   => array(
							'years'    => (float) $o['about_years'],
							'projects' => (float) $o['about_projects'],
							'leadsK'   => (float) $o['about_leadsK'],
							'place'    => (string) $o['about_place'],
							'placeSub' => (string) $o['about_placeSub'],
							'mission'  => array( 'title' => (string) $o['about_mission_title'], 'text' => (string) $o['about_mission_text'] ),
							'vision'   => array( 'title' => (string) $o['about_vision_title'], 'text' => (string) $o['about_vision_text'] ),
							'values'   => array(
								array( 'title' => (string) $o['about_value1_title'], 'text' => (string) $o['about_value1_text'] ),
								array( 'title' => (string) $o['about_value2_title'], 'text' => (string) $o['about_value2_text'] ),
								array( 'title' => (string) $o['about_value3_title'], 'text' => (string) $o['about_value3_text'] ),
							),
						),
					);
				},
			)
		);
	}
);

/** Saving options goes through the same publish pipeline as any post (auto-deploy.php). */
add_action(
	'update_option_' . SITE_OPT,
	function () {
		if ( function_exists( 'site_request_deploy' ) ) {
			site_request_deploy( 0, 'update_option:' . SITE_OPT );
		}
	}
);
