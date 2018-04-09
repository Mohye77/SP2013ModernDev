<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_ShortcutTopLinks.ascx.cs" Inherits="IFS.ControlTemplates.UC_ShortcutTopLinks" %>


<nav id="top-header">
    <ul>
        <asp:Repeater runat="server" ID="rptLinks">
            <ItemTemplate>
                <li>
                    <a href='<%#Eval("Url") %>' class='top-header-btn <%#Eval("CssClass") %>' target='<%#Eval("Target") %>'><%#Eval("Label") %></a>
                </li>
            </ItemTemplate>
        </asp:Repeater>

        <li class="switch-profile">
            <div class="dropdown">
                <button type="button" class="top-header-btn" data-toggle="dropdown">
                    <i class="icon-user-circle visible-xs"></i>
                    <span class="hidden-xs"><%=VotreProfil_Label %> : 
                        <strong>
                            <asp:Literal runat="server" ID="litCountry"></asp:Literal>
                            -
                        <asp:Literal runat="server" ID="litProfile"></asp:Literal>
                        </strong>
                    </span>
                </button>

                <div class="dropdown-menu dropdown-menu-right">
                    <p class="visible-xs">
                        <%=Pays_Label %>: 
                        <asp:Label runat="server" ID="lblCountry"></asp:Label><br />
                        <%=Profil_Label %>: 
                        <asp:Label runat="server" ID="lblProfile"></asp:Label>
                    </p>
                    <button type="button" id="btn-change-profile" class="btn btn-default"><%=Modifier_Label %></button>
                </div>
            </div>
        </li>

        <li class="switch-language">
            <%if (!HasVariations)
                { %>
            	<span class="top-header-btn"><%=CurrentLanguageCode %></span>
            <%}
            else
            { %>
            <div class="dropdown">
                <button type="button" class="top-header-btn" data-toggle="dropdown"><%=CurrentLanguageCode %></button>
                <ul class="dropdown-menu dropdown-menu-right" >
                    <asp:Repeater runat="server" ID="rptLanguages">
                        <ItemTemplate>
                            <li><a href='<%#Eval("Url") %>'><%#Eval("Label") %></a></li>
                        </ItemTemplate>
                    </asp:Repeater>
                </ul>
            </div>
            <%} %>
        </li>
    </ul>



</nav>
