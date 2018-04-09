<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_Disclaimer.ascx.cs" Inherits="IFS.ControlTemplates.UC_Disclaimer" %>

<asp:Panel class="disclaimer-wrapper" runat="server" id="pnlDisclaimer">
	<div id="disclaimer-container" class="country-not-selected">

		<div id="disclaimer-content">
			<div id="disclaimer-profile" class="disclaimer-block">
				<div class="disclaimer-block-inner">
					<div id="disclaimer-logo">
						<a href="/">
							<img src="/style%20library/ifs/images/logos/logo_edr_blue.svg" alt="Edmond de Rothschild">
						</a>
					</div>

					<h2><%=Bienvenue_Label %></h2>

					<p><%=Introduction_Label %></p>

					<p><%=VeuillezRenseigner_Label %></p>

					<div id="disclaimer-selection">
						<div class="dropdown" id="disclaimer-country-selector">
							<button type="button" class="btn btn-revert" data-toggle="dropdown" data-text-default="<%=SelectionnerPays_Label %>">
								<%=SelectionnerPays_Label %>
							</button>

							<ul class="dropdown-menu">
							</ul>
						</div>

						<div class="dropdown" id="disclaimer-profile-selector">
							<button type="button" class="btn btn-revert" data-toggle="dropdown" data-text-default="<%=Profil_Label %>">
								<%=Profil_Label %>
							</button>

							<ul class="dropdown-menu">
							</ul>
						</div>
					</div>

					<script id="disclaimer-countries-list-tpl" type="text/x-jsrender">
						{{for markets}}
						<li data-country="{{:Value}}" data-label="{{:Label}}"><a href="#">{{:Label}}</a></li>
						{{/for}}
					</script>

					<script id="disclaimer-profiles-list-tpl" type="text/x-jsrender">
						{{for markets itemVar="~market"}}
							{{for Profiles }}
							<li data-country="{{:~market.Value}}" data-profile="{{:Value}}" data-label="{{:Label}}"><a href="#">{{:Label}}</a></li>
							{{/for}}	
						{{/for}}
					</script>
				</div>
			</div>

			<div id="disclaimer-conditions" class="disclaimer-block">
				<div id="disclaimer-text" class="disclaimer-block-inner disclaimer-formatted-text">
				</div>
				<div id="disclaimer-btn" class="disclaimer-block-inner">
					<button type="reset" id="btn-reset-disclaimer"><%=Annuler_Label %></button>
					<button type="button" id="btn-submit-disclaimer" class="btn btn-primary"><%=Valider_Label %></button>
				</div>
			</div>
		</div>
		

	</div>
</asp:Panel>


